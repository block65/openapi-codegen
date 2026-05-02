import { join } from "node:path";
import camelcase from "camelcase";
import type { oas30, oas31 } from "openapi3-ts";
import {
	type CodeBlockWriter,
	type Project,
	type SourceFile,
	VariableDeclarationKind,
	type WriterFunction,
	Writers,
} from "ts-morph";
import type { Primitive } from "type-fest";
import type * as v from "valibot";
import { wordWrap } from "./utils.ts";

type SchemaMode = "exact" | "coerced";

interface ValidatorEntry {
	exact: string;
	coerced: string;
}

/**
 * Helper to generate v.name(...args) using ts-morph Writers
 */
function vcall(
	name: { [k in keyof typeof v]: k extends string ? k : never }[keyof typeof v],
	...args: (
		| string
		| WriterFunction
		| Primitive
		| (string | WriterFunction | Primitive)[]
	)[]
): WriterFunction {
	return (writer) => {
		writer.write(`v.${name}(`);
		args.forEach((arg, index) => {
			if (typeof arg === "function") {
				arg(writer);
			} else if (Array.isArray(arg)) {
				writer.write("[");
				arg.forEach((item, itemIndex) => {
					if (typeof item === "function") {
						item(writer);
					} else {
						writer.write(String(item));
					}
					if (itemIndex < arg.length - 1) {
						writer.write(", ");
					}
				});
				writer.write("]");
			} else {
				writer.write(String(arg));
			}
			if (index < args.length - 1) {
				writer.write(", ");
			}
		});
		writer.write(")");
	};
}

function schemaIsNullable(schema: oas30.SchemaObject | oas31.SchemaObject) {
	return (
		schema.type === "null" ||
		("nullable" in schema && schema.nullable) ||
		(Array.isArray(schema.type) && schema.type.includes("null"))
	);
}

function maybeNullable(
	validator: WriterFunction | string,
	isNullable: boolean,
) {
	return isNullable ? vcall("nullable", validator) : validator;
}

function maybePipe(
	base: WriterFunction | string,
	...constraints: (WriterFunction | string | undefined)[]
) {
	const valid = constraints.filter(Boolean);
	return valid.length > 0 ? vcall("pipe", base, ...valid) : base;
}

const noTrimFormats = new Set(["uuid", "byte", "binary", "password"]);

function schemaNeedsCoercion(
	schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
): boolean {
	if ("$ref" in schema) {
		return false;
	}
	if ("const" in schema) {
		return false;
	}
	if (schema.type === "integer" && schema.format === "int64") {
		return true;
	}
	if (
		schema.type === "string" &&
		!schema.enum &&
		!schema.pattern &&
		(!schema.format || !noTrimFormats.has(schema.format))
	) {
		return true;
	}
	if (schema.properties) {
		const required = new Set(schema.required ?? []);
		const hasOptional = Object.keys(schema.properties).some(
			(k) => !required.has(k),
		);
		if (hasOptional) {
			return true;
		}
		return Object.values(schema.properties).some((s) => schemaNeedsCoercion(s));
	}
	if (schema.items && !("$ref" in schema.items)) {
		return schemaNeedsCoercion(schema.items);
	}
	const combinator = schema.oneOf || schema.anyOf || schema.allOf;
	if (combinator) {
		return combinator.some((s) => schemaNeedsCoercion(s));
	}
	return false;
}

function resolveRef(
	validators: Map<string, ValidatorEntry>,
	ref: string,
	mode: SchemaMode,
): string | WriterFunction {
	const entry = validators.get(ref);
	if (!entry) {
		return vcall("unknown");
	}
	return mode === "exact" ? entry.exact : entry.coerced;
}

export function schemaToValidator(
	validators: Map<string, ValidatorEntry>,
	schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
	mode: SchemaMode,
): WriterFunction | string {
	if ("$ref" in schema) {
		return resolveRef(validators, schema.$ref, mode);
	}

	const isNullable = schemaIsNullable(schema);

	const typescriptHint =
		"x-typescript-hint" in schema &&
		typeof schema["x-typescript-hint"] === "string"
			? schema["x-typescript-hint"]
			: undefined;

	const typescriptHintSchema = typescriptHint
		? `v.custom<${typescriptHint}>(() => true)`
		: undefined;

	// Handle const values (OpenAPI 3.1: const: "value")
	if ("const" in schema) {
		return schema.const === null
			? vcall("null")
			: maybeNullable(
					vcall("literal", JSON.stringify(schema.const)),
					isNullable,
				);
	}

	// Handle type arrays (OpenAPI 3.1: type: ["string", "null"])
	if (Array.isArray(schema.type)) {
		const nonNullTypes = schema.type.filter((t) => t !== "null");
		const [singleType] = nonNullTypes;

		if (nonNullTypes.length === 1 && singleType) {
			return maybeNullable(
				schemaToValidator(
					validators,
					{
						...schema,
						type: singleType,
					} satisfies typeof schema,
					mode,
				),
				isNullable,
			);
		}

		const variants = nonNullTypes.map((t) =>
			schemaToValidator(
				validators,
				{
					...schema,
					type: t,
				} satisfies typeof schema,
				mode,
			),
		);
		return maybeNullable(
			variants.length > 0 ? vcall("union", variants) : vcall("unknown"),
			isNullable,
		);
	}

	if (schema.type === "string") {
		const shouldTrim =
			mode === "coerced" &&
			!schema.pattern &&
			(!schema.format || !noTrimFormats.has(schema.format));

		if (schema.enum) {
			return maybeNullable(
				vcall(
					"picklist",
					schema.enum.map((e) => JSON.stringify(e)),
				),
				isNullable,
			);
		}

		return maybeNullable(
			maybePipe(
				vcall("string"),
				shouldTrim ? vcall("trim") : undefined,
				schema.format === "email" ? vcall("email") : undefined,
				schema.format === "uuid" ? vcall("uuid") : undefined,

				schema.minLength !== undefined
					? vcall("minLength", schema.minLength)
					: undefined,
				schema.maxLength !== undefined
					? vcall("maxLength", schema.maxLength)
					: undefined,
				schema.pattern
					? vcall("regex", `new RegExp(${JSON.stringify(schema.pattern)})`)
					: undefined,
				typescriptHintSchema,
			),
			isNullable,
		);
	}

	if (schema.type === "integer" && schema.format === "int64") {
		const exactValidator = maybePipe(
			vcall("bigint"),
			schema.minimum !== undefined
				? vcall("minValue", `BigInt(${schema.minimum})`)
				: undefined,
			schema.maximum !== undefined
				? vcall("maxValue", `BigInt(${schema.maximum})`)
				: undefined,
			typescriptHintSchema,
		);

		if (mode === "exact") {
			return maybeNullable(exactValidator, isNullable);
		}

		return maybeNullable(
			vcall("union", [
				vcall(
					"pipe",
					vcall("string"),
					vcall("decimal"),
					vcall("toBigint"),
					exactValidator,
				),
				vcall(
					"pipe",
					vcall("number"),
					vcall("integer"),
					vcall("toBigint"),
					exactValidator,
				),
				exactValidator,
			]),
			isNullable,
		);
	}

	if (schema.type === "number" || schema.type === "integer") {
		const isInteger = schema.type === "integer";
		return maybeNullable(
			maybePipe(
				vcall("number"),
				isInteger ? vcall("integer") : undefined,
				schema.minimum !== undefined
					? vcall("minValue", schema.minimum)
					: undefined,
				schema.maximum !== undefined
					? vcall("maxValue", schema.maximum)
					: undefined,
				typescriptHintSchema,
			),
			isNullable,
		);
	}

	if (schema.type === "boolean") {
		return maybeNullable(vcall("boolean"), isNullable);
	}

	if (schema.type === "array") {
		const items = schema.items
			? schemaToValidator(validators, schema.items, mode)
			: vcall("unknown");

		return maybeNullable(
			maybePipe(
				vcall("array", items),
				schema.minItems !== undefined
					? vcall("minLength", schema.minItems)
					: undefined,
				schema.maxItems !== undefined
					? vcall("maxLength", schema.maxItems)
					: undefined,
			),
			isNullable,
		);
	}

	const combinator = schema.oneOf || schema.anyOf || schema.allOf;
	if (combinator) {
		const variants = combinator.map((s) =>
			schemaToValidator(validators, s, mode),
		);
		const type = schema.allOf ? "intersect" : "union";

		if (schema.oneOf && schema.discriminator?.propertyName) {
			return maybeNullable(
				vcall(
					"variant",
					JSON.stringify(schema.discriminator.propertyName),
					variants,
				),
				isNullable,
			);
		}
		return maybeNullable(vcall(type, variants), isNullable);
	}

	if (schema.type === "object" || schema.properties || !schema.type) {
		const props = schema.properties ?? {};
		if (Object.keys(props).length === 0) {
			return maybeNullable(
				vcall("record", vcall("string"), vcall("unknown")),
				isNullable,
			);
		}

		const requiredProps = new Set(schema.required ?? []);
		const optionalWrapper = mode === "exact" ? "exactOptional" : "optional";

		const strictObjectWriter = (writer: CodeBlockWriter) => {
			writer.writeLine("{");
			writer.indent(() => {
				Object.entries(props).forEach(([name, s]) => {
					const isRequired = requiredProps.has(name);
					const validator = schemaToValidator(validators, s, mode);
					const finalValidator = isRequired
						? validator
						: vcall(optionalWrapper, validator);

					// write comment
					if (!("$ref" in s) && s.description) {
						writer.writeLine("/**");
						writer.writeLine(
							` * ${wordWrap(s.description).split("\n").join("\n * ")}`,
						);
						writer.writeLine(" */");
					}

					writer.write(`${JSON.stringify(name)}: `);
					if (typeof finalValidator === "function") {
						finalValidator(writer);
					} else {
						writer.write(finalValidator);
					}
					writer.writeLine(",");
				});
			});
			writer.write("}");
		};

		return maybeNullable(vcall("strictObject", strictObjectWriter), isNullable);
	}

	if (schema.type === "null") {
		return vcall("null");
	}

	return vcall("unknown");
}

export function createValibotFile(project: Project, outputDir: string) {
	const file = project.createSourceFile(join(outputDir, "valibot.ts"), "", {
		overwrite: true,
	});

	// Valibot import
	file.addImportDeclaration({
		moduleSpecifier: "valibot",
		namespaceImport: "v",
	});

	return file;
}

export function registerValidatorFromSchema(
	validators: Map<string, ValidatorEntry>,
	valibotFile: SourceFile,
	schemaName: string,
	schemaObject: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
	exactOnly?: boolean,
) {
	const exactName = camelcase(["exact", schemaName, "schema"]);
	const coercedName = camelcase([schemaName, "schema"]);

	validators.set(`#/components/schemas/${schemaName}`, {
		exact: exactName,
		coerced: coercedName,
	});

	const docs =
		!("$ref" in schemaObject) && schemaObject.description
			? [
					{
						description: wordWrap(schemaObject.description),
						tags: [
							...(schemaObject.deprecated
								? [
										{
											tagName: "deprecated",
										},
									]
								: []),
							...(schemaObject.title
								? [
										{
											tagName: "title",
											text: schemaObject.title,
										},
									]
								: []),
							...(schemaObject.example
								? [
										{
											tagName: "example",
											text: JSON.stringify(schemaObject.example, null, 2),
										},
									]
								: []),
						].filter(Boolean),
					},
				]
			: [];

	// Exact schema — always emitted
	valibotFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		docs,
		declarations: [
			{
				name: exactName,
				initializer: schemaToValidator(validators, schemaObject, "exact"),
			},
		],
	});

	// Coerced schema — unless --exact-only
	if (!exactOnly) {
		if (schemaNeedsCoercion(schemaObject)) {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: coercedName,
						initializer: schemaToValidator(validators, schemaObject, "coerced"),
					},
				],
			});
		} else {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: coercedName,
						initializer: exactName,
					},
				],
			});
		}
	}
}

/**
 * Wraps a validator with string-to-native coercion for HTTP params (query/header).
 * These always arrive as strings on the wire, so coercion is justified.
 * For non-numeric types, returns the validator unchanged.
 */
function asHttpParamValidator(
	validatorSchemas: Map<string, ValidatorEntry>,
	schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
): WriterFunction | string {
	if ("$ref" in schema) {
		return resolveRef(validatorSchemas, schema.$ref, "coerced");
	}

	const exactValidator = schemaToValidator(validatorSchemas, schema, "exact");

	if (schema.type === "integer" && schema.format === "int64") {
		return vcall("union", [
			vcall(
				"pipe",
				vcall("string"),
				vcall("decimal"),
				vcall("toBigint"),
				exactValidator,
			),
			vcall(
				"pipe",
				vcall("number"),
				vcall("integer"),
				vcall("toBigint"),
				exactValidator,
			),
			exactValidator,
		]);
	}

	if (schema.type === "integer") {
		return vcall("union", [
			vcall(
				"pipe",
				vcall("string"),
				vcall("decimal"),
				vcall("toNumber"),
				exactValidator,
			),
			exactValidator,
		]);
	}

	if (schema.type === "number") {
		return vcall("union", [
			vcall(
				"pipe",
				vcall("string"),
				vcall("decimal"),
				vcall("toNumber"),
				exactValidator,
			),
			exactValidator,
		]);
	}

	return schemaToValidator(validatorSchemas, schema, "coerced");
}

/**
 * Creates validator schemas for operation input (body, params, query) in the
 * valibot file. Returns the schema names for use in middleware generation.
 */
export function createValidatorForOperationInput(
	validatorSchemas: Map<string, ValidatorEntry>,
	valibotFile: SourceFile,
	commandName: string,
	input: {
		body?: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject;
		params: oas30.ParameterObject[];
		query: oas30.ParameterObject[];
		header: oas30.ParameterObject[];
	},
	exactOnly?: boolean,
): {
	exact: { json?: string; param?: string; query?: string; header?: string };
	coerced: { json?: string; param?: string; query?: string; header?: string };
} {
	const exact: {
		json?: string;
		param?: string;
		query?: string;
		header?: string;
	} = {};
	const coerced: {
		json?: string;
		param?: string;
		query?: string;
		header?: string;
	} = {};

	// 1. Generate the JSON Body Schema
	if (input.body) {
		const exactName = camelcase(["exact", commandName, "body", "schema"]);
		const coercedName = camelcase([commandName, "body", "schema"]);
		exact.json = exactName;
		coerced.json = coercedName;

		valibotFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name: exactName,
					initializer: schemaToValidator(validatorSchemas, input.body, "exact"),
				},
			],
		});

		if (!exactOnly) {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: coercedName,
						initializer: schemaToValidator(
							validatorSchemas,
							input.body,
							"coerced",
						),
					},
				],
			});
		}
	}

	// 2. Helper for Params/Query (Strict Objects)
	const addParams = (
		type: "params" | "query",
		list: oas30.ParameterObject[],
	) => {
		if (list.length === 0) {
			return;
		}
		const schemaKey = type === "params" ? "param" : "query";

		const exactName = camelcase(["exact", commandName, type, "schema"]);
		const coercedName = camelcase([commandName, type, "schema"]);
		exact[schemaKey] = exactName;
		coerced[schemaKey] = coercedName;

		const isHttpParam = type === "query";

		const buildPropertyMap = (mode: SchemaMode) =>
			Object.fromEntries(
				list.map((p) => {
					const paramSchema = p.schema ?? { type: "string" as const };
					const optionalWrapper =
						mode === "exact" ? "exactOptional" : "optional";
					const validator =
						mode === "coerced" && isHttpParam
							? asHttpParamValidator(validatorSchemas, paramSchema)
							: schemaToValidator(validatorSchemas, paramSchema, mode);
					return [
						JSON.stringify(p.name),
						p.required ? validator : vcall(optionalWrapper, validator),
					];
				}),
			);

		valibotFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name: exactName,
					initializer: vcall(
						"strictObject",
						Writers.object(buildPropertyMap("exact")),
					),
				},
			],
		});

		if (!exactOnly) {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: coercedName,
						initializer: vcall(
							"strictObject",
							Writers.object(buildPropertyMap("coerced")),
						),
					},
				],
			});
		}
	};

	addParams("params", input.params);
	addParams("query", input.query);

	// 3. Header schema (non-strict to allow extra HTTP headers)
	if (input.header.length > 0) {
		const exactName = camelcase(["exact", commandName, "header", "schema"]);
		const coercedName = camelcase([commandName, "header", "schema"]);
		exact.header = exactName;
		coerced.header = coercedName;

		const buildPropertyMap = (mode: SchemaMode) =>
			Object.fromEntries(
				input.header.map((p) => {
					const paramSchema = p.schema ?? { type: "string" as const };
					const optionalWrapper =
						mode === "exact" ? "exactOptional" : "optional";
					const validator =
						mode === "coerced"
							? asHttpParamValidator(validatorSchemas, paramSchema)
							: schemaToValidator(validatorSchemas, paramSchema, mode);
					return [
						JSON.stringify(p.name.toLowerCase()),
						p.required ? validator : vcall(optionalWrapper, validator),
					];
				}),
			);

		valibotFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name: exactName,
					initializer: vcall(
						"object",
						Writers.object(buildPropertyMap("exact")),
					),
				},
			],
		});

		if (!exactOnly) {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: coercedName,
						initializer: vcall(
							"object",
							Writers.object(buildPropertyMap("coerced")),
						),
					},
				],
			});
		}
	}

	return { exact, coerced };
}
