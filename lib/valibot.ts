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

// Two variants per type, split by direction of data flow:
//
//   input — for outgoing/TS-side values. Uses `v.optional(...)`, so callers can
//     pass `{ foo: undefined }` (common in destructure-with-default patterns).
//     No wire coercion since TS types are already native.
//
//   wire  — for incoming JSON-parsed values (server middleware, response
//     parsing). Uses `v.exactOptional(...)` — undefined can't appear on the
//     wire, so a field is either present-with-a-value or absent. Includes
//     bigint / number coercion since JSON & HTTP carry those as strings.
type SchemaMode = "input" | "wire";

interface ValidatorEntry {
	input: string;
	wire: string;
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

function stringNeedsCoercion(
	schema: oas30.SchemaObject | oas31.SchemaObject,
): boolean {
	return (
		!schema.enum &&
		!schema.pattern &&
		(!schema.format || !noTrimFormats.has(schema.format))
	);
}

function propertiesNeedCoercion(
	schema: oas30.SchemaObject | oas31.SchemaObject,
): boolean {
	const properties = schema.properties ?? {};
	const required = new Set(schema.required ?? []);
	const hasOptional = Object.keys(properties).some((k) => !required.has(k));
	return (
		hasOptional || Object.values(properties).some((s) => schemaNeedsCoercion(s))
	);
}

function schemaNeedsCoercion(
	schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
): boolean {
	if ("$ref" in schema || "const" in schema) {
		return false;
	}
	if (schema.type === "integer" && schema.format === "int64") {
		return true;
	}
	if (schema.type === "string" && stringNeedsCoercion(schema)) {
		return true;
	}
	if (schema.properties) {
		return propertiesNeedCoercion(schema);
	}
	if (schema.items && !("$ref" in schema.items)) {
		return schemaNeedsCoercion(schema.items);
	}
	const combinator = schema.oneOf || schema.anyOf || schema.allOf;
	return combinator ? combinator.some((s) => schemaNeedsCoercion(s)) : false;
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
	return mode === "input" ? entry.input : entry.wire;
}

function schemaToValidator(
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
			mode === "wire" &&
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
		const baseValidator = maybePipe(
			vcall("bigint"),
			schema.minimum !== undefined
				? vcall("minValue", `BigInt(${schema.minimum})`)
				: undefined,
			schema.maximum !== undefined
				? vcall("maxValue", `BigInt(${schema.maximum})`)
				: undefined,
			typescriptHintSchema,
		);

		if (mode === "input") {
			return maybeNullable(baseValidator, isNullable);
		}

		return maybeNullable(
			vcall("union", [
				vcall(
					"pipe",
					vcall("string"),
					vcall("decimal"),
					vcall("toBigint"),
					baseValidator,
				),
				vcall(
					"pipe",
					vcall("number"),
					vcall("integer"),
					vcall("toBigint"),
					baseValidator,
				),
				baseValidator,
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
		const optionalWrapper = mode === "input" ? "optional" : "exactOptional";

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
	inputOnly?: boolean,
) {
	const inputName = camelcase(["input", schemaName, "schema"]);
	const wireName = camelcase([schemaName, "schema"]);

	validators.set(`#/components/schemas/${schemaName}`, {
		input: inputName,
		wire: wireName,
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

	// Input schema — always emitted (TS-side, allows undefined, no wire coercion)
	valibotFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		docs,
		declarations: [
			{
				name: inputName,
				initializer: schemaToValidator(validators, schemaObject, "input"),
			},
		],
	});

	// Wire schema — unless --input-only (parses incoming JSON: no undefined,
	// with bigint/number coercion). Aliases to the input schema when the type
	// has no coercion concerns and the only difference would be optional vs
	// exactOptional — both are equivalent on JSON-parsed data anyway.
	if (!inputOnly) {
		if (schemaNeedsCoercion(schemaObject)) {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: wireName,
						initializer: schemaToValidator(validators, schemaObject, "wire"),
					},
				],
			});
		} else {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: wireName,
						initializer: inputName,
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
		return resolveRef(validatorSchemas, schema.$ref, "wire");
	}

	const baseValidator = schemaToValidator(validatorSchemas, schema, "input");

	if (schema.type === "integer" && schema.format === "int64") {
		return vcall("union", [
			vcall(
				"pipe",
				vcall("string"),
				vcall("decimal"),
				vcall("toBigint"),
				baseValidator,
			),
			vcall(
				"pipe",
				vcall("number"),
				vcall("integer"),
				vcall("toBigint"),
				baseValidator,
			),
			baseValidator,
		]);
	}

	if (schema.type === "integer") {
		return vcall("union", [
			vcall(
				"pipe",
				vcall("string"),
				vcall("decimal"),
				vcall("toNumber"),
				baseValidator,
			),
			baseValidator,
		]);
	}

	if (schema.type === "number") {
		return vcall("union", [
			vcall(
				"pipe",
				vcall("string"),
				vcall("decimal"),
				vcall("toNumber"),
				baseValidator,
			),
			baseValidator,
		]);
	}

	return schemaToValidator(validatorSchemas, schema, "wire");
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
		response?: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject;
		params: oas30.ParameterObject[];
		query: oas30.ParameterObject[];
		header: oas30.ParameterObject[];
	},
	inputOnly?: boolean,
): {
	input: {
		json?: string;
		response?: string;
		param?: string;
		query?: string;
		header?: string;
	};
	wire: {
		json?: string;
		response?: string;
		param?: string;
		query?: string;
		header?: string;
	};
} {
	const inputResult: {
		json?: string;
		response?: string;
		param?: string;
		query?: string;
		header?: string;
	} = {};
	const wireResult: {
		json?: string;
		response?: string;
		param?: string;
		query?: string;
		header?: string;
	} = {};

	const emitSchemaPair = (
		segment: "body" | "response",
		schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
	) => {
		const inputName = camelcase(["input", commandName, segment, "schema"]);
		const wireName = camelcase([commandName, segment, "schema"]);

		valibotFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name: inputName,
					initializer: schemaToValidator(validatorSchemas, schema, "input"),
				},
			],
		});

		if (!inputOnly) {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: wireName,
						initializer: schemaToValidator(validatorSchemas, schema, "wire"),
					},
				],
			});
		}

		return { inputName, wireName };
	};

	// 1. Generate the JSON Body Schema
	if (input.body) {
		const { inputName, wireName } = emitSchemaPair("body", input.body);
		inputResult.json = inputName;
		wireResult.json = wireName;
	}

	// 1b. Generate the Response Schema (mirrors body — accepts inline or $ref)
	if (input.response) {
		const { inputName, wireName } = emitSchemaPair(
			"response",
			input.response,
		);
		inputResult.response = inputName;
		wireResult.response = wireName;
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

		const inputName = camelcase(["input", commandName, type, "schema"]);
		const wireName = camelcase([commandName, type, "schema"]);
		inputResult[schemaKey] = inputName;
		wireResult[schemaKey] = wireName;

		const isHttpParam = type === "query";

		const buildPropertyMap = (mode: SchemaMode) =>
			Object.fromEntries(
				list.map((p) => {
					const paramSchema = p.schema ?? { type: "string" as const };
					const optionalWrapper =
						mode === "input" ? "optional" : "exactOptional";
					const validator =
						mode === "wire" && isHttpParam
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
					name: inputName,
					initializer: vcall(
						"strictObject",
						Writers.object(buildPropertyMap("input")),
					),
				},
			],
		});

		if (!inputOnly) {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: wireName,
						initializer: vcall(
							"strictObject",
							Writers.object(buildPropertyMap("wire")),
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
		const inputName = camelcase(["input", commandName, "header", "schema"]);
		const wireName = camelcase([commandName, "header", "schema"]);
		inputResult.header = inputName;
		wireResult.header = wireName;

		const buildPropertyMap = (mode: SchemaMode) =>
			Object.fromEntries(
				input.header.map((p) => {
					const paramSchema = p.schema ?? { type: "string" as const };
					const optionalWrapper =
						mode === "input" ? "optional" : "exactOptional";
					const validator =
						mode === "wire"
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
					name: inputName,
					initializer: vcall(
						"object",
						Writers.object(buildPropertyMap("input")),
					),
				},
			],
		});

		if (!inputOnly) {
			valibotFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: wireName,
						initializer: vcall(
							"object",
							Writers.object(buildPropertyMap("wire")),
						),
					},
				],
			});
		}
	}

	return { input: inputResult, wire: wireResult };
}
