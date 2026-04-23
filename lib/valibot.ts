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
					if (itemIndex < arg.length - 1) writer.write(", ");
				});
				writer.write("]");
			} else {
				writer.write(String(arg));
			}
			if (index < args.length - 1) writer.write(", ");
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

export function schemaToValidator(
	validators: Map<string, string>,
	schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
): WriterFunction | string {
	if ("$ref" in schema) {
		return validators.get(schema.$ref) ?? vcall("unknown");
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
				schemaToValidator(validators, {
					...schema,
					type: singleType,
				} satisfies typeof schema),
				isNullable,
			);
		}

		const variants = nonNullTypes.map((t) =>
			schemaToValidator(validators, {
				...schema,
				type: t,
			} satisfies typeof schema),
		);
		return maybeNullable(
			variants.length > 0 ? vcall("union", variants) : vcall("unknown"),
			isNullable,
		);
	}

	if (schema.type === "string") {
		if (schema.enum) {
			return maybeNullable(
				vcall(
					"picklist",
					schema.enum.map((e) => JSON.stringify(e)),
				),
				isNullable,
			);
		}

		// NOTE: these should be ordered so the most helpful validations come first
		// (ie digits before maxLen) and also it must ensure that valibot type check
		// is not violated
		return maybeNullable(
			maybePipe(
				vcall("string"),
				schema.format === "email" ? vcall("email") : undefined,
				schema.format === "uuid" ? vcall("uuid") : undefined,
				schema.format === "int32" ? vcall("digits") : undefined,
				schema.format === "int64" ? vcall("digits") : undefined,

				schema.minLength !== undefined
					? vcall("minLength", schema.minLength)
					: undefined,
				schema.maxLength !== undefined
					? vcall("maxLength", schema.maxLength)
					: undefined,
				schema.pattern
					? vcall("regex", `new RegExp(${JSON.stringify(schema.pattern)})`)
					: undefined,

				...(schema.format?.startsWith("int")
					? [
							"v.transform((n) => Number.parseInt(n, 10))",
							vcall("number"),
							vcall("integer"),
							schema.minimum !== undefined
								? vcall("minValue", schema.minimum)
								: undefined,
							schema.maximum !== undefined
								? vcall("maxValue", schema.maximum)
								: undefined,
						]
					: []),
				typescriptHintSchema,
			),
			isNullable,
		);
	}

	if (schema.type === "number" || schema.type === "integer") {
		return maybeNullable(
			maybePipe(
				vcall("number"),
				schema.type.startsWith("int") ? vcall("integer") : undefined,
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
			? schemaToValidator(validators, schema.items)
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
		const variants = combinator.map((s) => schemaToValidator(validators, s));
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

		const strictObjectWriter = (writer: CodeBlockWriter) => {
			writer.writeLine("{");
			writer.indent(() => {
				Object.entries(props).forEach(([name, s]) => {
					const isRequired = requiredProps.has(name);
					const validator = schemaToValidator(validators, s);
					const finalValidator = isRequired
						? validator
						: vcall("exactOptional", validator);

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
	validators: Map<string, string>,
	valibotFile: SourceFile,
	schemaName: string,
	schemaObject: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
) {
	const validatorName = camelcase([schemaName, "schema"]);

	validators.set(`#/components/schemas/${schemaName}`, validatorName);

	valibotFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		docs:
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
				: [],
		declarations: [
			{
				name: validatorName,
				initializer: schemaToValidator(validators, schemaObject),
			},
		],
	});
}

/**
 * Creates validator schemas for operation input (body, params, query) in the
 * valibot file. Returns the schema names for use in middleware generation.
 */
export function createValidatorForOperationInput(
	validatorSchemas: Map<string, string>,
	valibotFile: SourceFile,
	commandName: string,
	input: {
		body?: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject;
		params: oas30.ParameterObject[];
		query: oas30.ParameterObject[];
		header: oas30.ParameterObject[];
	},
): { json?: string; param?: string; query?: string; header?: string } {
	const schemas: {
		json?: string;
		param?: string;
		query?: string;
		header?: string;
	} = {};

	// 1. Generate the JSON Body Schema
	if (input.body) {
		const name = camelcase([commandName, "body", "schema"]);
		schemas.json = name;
		valibotFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name,
					initializer: schemaToValidator(validatorSchemas, input.body),
				},
			],
		});
	}

	// HTTP params (query, header) arrive as strings. When the schema
	// declares type: "integer" or "number", rewrite it to type: "string"
	// with an int format so the existing string→number coercion pipeline
	// handles parsing and validation.
	const asHttpParamSchema = (
		schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
	): oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject => {
		if ("$ref" in schema) return schema;
		if (schema.type === "integer" || schema.type === "number") {
			return {
				...schema,
				type: "string",
				format: schema.type === "integer" ? "int64" : "int64",
			};
		}
		return schema;
	};

	// 2. Helper for Params/Query (Strict Objects)
	const addParams = (
		type: "params" | "query",
		list: oas30.ParameterObject[],
	) => {
		if (list.length === 0) return;
		const name = camelcase([commandName, type, "schema"]);
		schemas[type === "params" ? "param" : "query"] = name;

		const coerce = type === "query";

		const propertyMap = Object.fromEntries(
			list.map((p) => {
				const paramSchema = coerce
					? asHttpParamSchema(p.schema ?? { type: "string" })
					: (p.schema ?? { type: "string" });
				return [
					JSON.stringify(p.name),
					p.required
						? schemaToValidator(validatorSchemas, paramSchema)
						: vcall(
								"exactOptional",
								schemaToValidator(validatorSchemas, paramSchema),
							),
				];
			}),
		);

		valibotFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name,
					initializer: vcall("strictObject", Writers.object(propertyMap)),
				},
			],
		});
	};

	addParams("params", input.params);
	addParams("query", input.query);

	// 3. Header schema (non-strict to allow extra HTTP headers)
	if (input.header.length > 0) {
		const name = camelcase([commandName, "header", "schema"]);
		schemas.header = name;

		const propertyMap = Object.fromEntries(
			input.header.map((p) => {
				const paramSchema = asHttpParamSchema(
					p.schema ?? { type: "string" },
				);
				return [
					JSON.stringify(p.name.toLowerCase()),
					p.required
						? schemaToValidator(validatorSchemas, paramSchema)
						: vcall(
								"exactOptional",
								schemaToValidator(validatorSchemas, paramSchema),
							),
				];
			}),
		);

		valibotFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name,
					initializer: vcall("object", Writers.object(propertyMap)),
				},
			],
		});
	}

	return schemas;
}
