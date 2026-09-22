import path from "node:path";
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
import { typedEntries, wordWrap } from "./utils.ts";

// input uses `v.optional` and skips coercion, wire uses `v.exactOptional`
type SchemaMode = "input" | "wire";

type ValidatorEntry = {
	input: string;
	wire: string;
};

// oxlint groups integer digits in threes once a literal reaches five digits
function numericLiteral(value: number) {
	const text = String(value);
	const [integer = "", ...fraction] = text.split(".");
	const digits = integer.replace("-", "");

	if (digits.length < 5 || /\D/u.test(digits)) {
		return text;
	}

	return [integer.replaceAll(/\B(?=(\d{3})+$)/gu, "_"), ...fraction].join(".");
}

// A bigint literal takes an integer, and a document may declare any number
function bigintLiteral(value: number) {
	return Number.isInteger(value)
		? `${numericLiteral(value)}n`
		: `BigInt(${value})`;
}

// oxlint requires String.raw where a pattern escapes a backslash
function regexSource(pattern: string) {
	const rawUnsafe = /`|\$\{|\\$/u;

	if (pattern.includes("\\") && !rawUnsafe.test(pattern)) {
		return `String.raw\`${pattern}\``;
	}

	return JSON.stringify(pattern);
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
) {
	return (writer: CodeBlockWriter) => {
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
						writer.write(item?.toString() ?? "undefined");
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

function minMaxProperties(schema: oas30.SchemaObject | oas31.SchemaObject) {
	return [
		schema.minProperties === undefined
			? undefined
			: vcall("minEntries", schema.minProperties),
		schema.maxProperties === undefined
			? undefined
			: vcall("maxEntries", schema.maxProperties),
	];
}

const noTrimFormats = new Set(["uuid", "byte", "binary", "password"]);

// RFC 3339 temporal formats, validated by regex at runtime
function temporalRegexConstraint(format: string | undefined) {
	// RFC 3339 departs from ISO 8601 in ways these patterns encode. `date-time`
	// and `time` require an offset. The seconds field admits a leap second of
	// `60`. `T` and `Z` may be lower case, and a space may separate the date
	// from the time. `duration` follows the ISO 8601 grammar in Appendix A
	switch (format) {
		case "date":
			return vcall(
				"regex",
				String.raw`/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u`,
				JSON.stringify(format),
			);
		case "time":
			return vcall(
				"regex",
				String.raw`/^([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?([Zz]|[+-]([01]\d|2[0-3]):[0-5]\d)$/u`,
				JSON.stringify(format),
			);
		case "date-time":
			return vcall(
				"regex",
				String.raw`/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[Tt ]([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d+)?([Zz]|[+-]([01]\d|2[0-3]):[0-5]\d)$/u`,
				JSON.stringify(format),
			);
		case "duration":
			return vcall(
				"regex",
				String.raw`/^P(?!$)((\d+Y)?(\d+M)?(\d+W)?(\d+D)?)(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/u`,
				JSON.stringify(format),
			);
		default:
			return;
	}
}

// Template-literal type per temporal format, mirrored in process-schema
function temporalTypeHint(format: string | undefined) {
	switch (format) {
		case "date":
			// biome-ignore lint/suspicious/noTemplateCurlyInString: template literal type
			return "`${number}-${number}-${number}`";
		case "time":
			// biome-ignore lint/suspicious/noTemplateCurlyInString: template literal type
			return "`${number}:${number}:${number}${string}`";
		case "date-time":
			// biome-ignore lint/suspicious/noTemplateCurlyInString: template literal type
			return "`${number}-${number}-${number}T${number}:${number}:${number}${string}`";
		case "duration":
			// biome-ignore lint/suspicious/noTemplateCurlyInString: template literal type
			return "`P${string}`";
		default:
			return;
	}
}

// Narrows the inferred output to the template-literal type, past the regex
function temporalHintSchema(format: string | undefined) {
	const type = temporalTypeHint(format);
	return type ? `v.custom<${type}>(() => true)` : undefined;
}

function shouldCoerceString(schema: oas30.SchemaObject | oas31.SchemaObject) {
	return (
		!schema.enum &&
		!schema.pattern &&
		(!schema.format || !noTrimFormats.has(schema.format))
	);
}

function propertiesNeedCoercion(
	schema: oas30.SchemaObject | oas31.SchemaObject,
) {
	const properties = schema.properties ?? {};
	const required = new Set(schema.required);
	const hasOptional = Object.keys(properties).some((k) => !required.has(k));

	return (
		hasOptional || Object.values(properties).some((s) => shouldCoerceSchema(s))
	);
}

function shouldCoerceSchema(
	schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
): boolean {
	if ("$ref" in schema || "const" in schema) {
		return false;
	}

	if (schema.type === "integer" && schema.format === "int64") {
		return true;
	}

	if (schema.type === "string" && shouldCoerceString(schema)) {
		return true;
	}

	if (schema.properties) {
		return propertiesNeedCoercion(schema);
	}

	if (schema.items && !("$ref" in schema.items)) {
		return shouldCoerceSchema(schema.items);
	}

	const combinator = schema.oneOf || schema.anyOf || schema.allOf;

	return combinator ? combinator.some((s) => shouldCoerceSchema(s)) : false;
}

function resolveRef(
	validators: Map<string, ValidatorEntry>,
	ref: string,
	mode: SchemaMode,
) {
	const entry = validators.get(ref);
	if (!entry) {
		return vcall("unknown");
	}
	return mode === "input" ? entry.input : entry.wire;
}

type AnySchemaOrRef =
	| oas30.SchemaObject
	| oas30.ReferenceObject
	| oas31.SchemaObject
	| oas31.ReferenceObject;

function writeStrictObjectEntries(
	writer: CodeBlockWriter,
	validators: Map<string, ValidatorEntry>,
	properties: Record<string, AnySchemaOrRef>,
	requiredProps: ReadonlySet<string>,
	mode: SchemaMode,
	toValidator: (
		validators: Map<string, ValidatorEntry>,
		schema: AnySchemaOrRef,
		mode: SchemaMode,
	) => WriterFunction | string = schemaToValidator,
) {
	// input schemas face TS callers, so `v.optional` lets them pass
	// `{ foo: undefined }`. wire schemas face JSON-parsed payloads, where
	// `undefined` is absent by construction
	const optionalWrapper = mode === "input" ? "optional" : "exactOptional";
	Object.entries(properties).forEach(([name, s]) => {
		const isRequired = requiredProps.has(name);
		const validator = toValidator(validators, s, mode);
		const finalValidator = isRequired
			? validator
			: vcall(optionalWrapper, validator);

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
}

type AnySchema = oas30.SchemaObject | oas31.SchemaObject;

// Narrows the inferred output to the `x-typescript-hint` type
function extensionHintSchema(schema: AnySchema) {
	const typescriptHint =
		"x-typescript-hint" in schema &&
		typeof schema["x-typescript-hint"] === "string"
			? schema["x-typescript-hint"]
			: undefined;

	return typescriptHint ? `v.custom<${typescriptHint}>(() => true)` : undefined;
}

function enumValidator(values: unknown[], isNullable: boolean) {
	// Enums short-circuit every type-specific constraint. Valid values are
	// exactly the enum members, under any declared type, format or minLength.
	// Layering string() or minLength() on top yields a misleading error about
	// the wrong contract, so emit a bare picklist
	const hasNull = values.some((value) => value === null);
	const members = values.filter((value) => value !== null);
	const [first, ...rest] = members;

	if (first === undefined) {
		return vcall("null");
	}

	// `picklist` only accepts string | number | bigint members
	const picklistable = members.every(
		(value) => typeof value === "string" || typeof value === "number",
	);

	if (picklistable) {
		return maybeNullable(
			vcall(
				"picklist",
				members.map((value) => JSON.stringify(value)),
			),
			isNullable || hasNull,
		);
	}

	// Boolean and other literals use `literal()` instead, or a `union` of
	// them when there is more than one
	const base =
		rest.length === 0
			? vcall("literal", JSON.stringify(first))
			: vcall(
					"union",
					members.map((value) => vcall("literal", JSON.stringify(value))),
				);

	return maybeNullable(base, isNullable || hasNull);
}

// Handle type arrays, added in OpenAPI 3.1
function typeArrayValidator(
	validators: Map<string, ValidatorEntry>,
	schema: AnySchema,
	types: oas31.SchemaObjectType[],
	mode: SchemaMode,
	isNullable: boolean,
) {
	const nonNullTypes = types.filter((t) => t !== "null");
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

function stringValidator(
	schema: AnySchema,
	mode: SchemaMode,
	isNullable: boolean,
	typescriptHintSchema: string | undefined,
) {
	const shouldTrim =
		mode === "wire" &&
		!schema.pattern &&
		(!schema.format || !noTrimFormats.has(schema.format));

	return maybeNullable(
		maybePipe(
			vcall("string"),
			shouldTrim ? vcall("trim") : undefined,
			schema.format === "email" ? vcall("email") : undefined,
			schema.format === "uuid" ? vcall("uuid") : undefined,
			temporalRegexConstraint(schema.format),

			schema.minLength === undefined
				? undefined
				: vcall("minLength", numericLiteral(schema.minLength)),
			schema.maxLength === undefined
				? undefined
				: vcall("maxLength", numericLiteral(schema.maxLength)),
			schema.pattern
				? vcall("regex", `new RegExp(${regexSource(schema.pattern)})`)
				: undefined,
			// A hint set by the `x-typescript-hint` extension wins over the format
			typescriptHintSchema ? undefined : temporalHintSchema(schema.format),
			typescriptHintSchema,
		),
		isNullable,
	);
}

function int64Validator(
	schema: AnySchema,
	mode: SchemaMode,
	isNullable: boolean,
	typescriptHintSchema: string | undefined,
) {
	const baseValidator = maybePipe(
		vcall("bigint"),
		schema.minimum === undefined
			? undefined
			: vcall("minValue", bigintLiteral(schema.minimum)),
		schema.maximum === undefined
			? undefined
			: vcall("maxValue", bigintLiteral(schema.maximum)),
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

function numberValidator(
	schema: AnySchema,
	isNullable: boolean,
	typescriptHintSchema: string | undefined,
) {
	const isInteger = schema.type === "integer";

	return maybeNullable(
		maybePipe(
			vcall("number"),
			isInteger ? vcall("integer") : undefined,
			schema.minimum === undefined
				? undefined
				: vcall("minValue", numericLiteral(schema.minimum)),
			schema.maximum === undefined
				? undefined
				: vcall("maxValue", numericLiteral(schema.maximum)),
			typescriptHintSchema,
		),
		isNullable,
	);
}

function writeSpreadEntries(
	writer: CodeBlockWriter,
	validator: WriterFunction | string,
) {
	writer.write("...");

	if (typeof validator === "function") {
		validator(writer);
	} else {
		writer.write(validator);
	}

	writer.writeLine(".entries,");
}

function writeAllOfMember(
	writer: CodeBlockWriter,
	validators: Map<string, ValidatorEntry>,
	member: AnySchemaOrRef,
	mode: SchemaMode,
) {
	if ("$ref" in member) {
		writeSpreadEntries(writer, resolveRef(validators, member.$ref, mode));

		return;
	}

	const isObjectShape =
		member.type === "object" ||
		(member.properties !== undefined && member.type === undefined);

	if (isObjectShape) {
		writeStrictObjectEntries(
			writer,
			validators,
			member.properties ?? {},
			new Set(member.required),
			mode,
		);

		return;
	}

	// Nested combinators and unusual shapes recurse, spreading the
	// result's entries. Valid as long as the recursion yields an
	// object-like schema, and GIGO otherwise
	writeSpreadEntries(writer, schemaToValidator(validators, member, mode));
}

function allOfObjectValidator(
	validators: Map<string, ValidatorEntry>,
	schema: AnySchema,
	allOfMembers: AnySchemaOrRef[],
	mode: SchemaMode,
	isNullable: boolean,
) {
	// allOf of object schemas composes into a single v.strictObject. Inline
	// object members contribute their properties directly, and $ref members
	// are spread via `<refName>.entries`. v.intersect of strictObjects is
	// unsatisfiable when member property sets differ, because each
	// strictObject independently rejects keys the others contribute
	return maybeNullable(
		maybePipe(
			// only a document that says additionalProperties false gets a
			// strict object
			vcall(
				schema.additionalProperties === false ? "strictObject" : "looseObject",
				(writer: CodeBlockWriter) => {
					writer.writeLine("{");
					writer.indent(() => {
						allOfMembers.forEach((member) => {
							writeAllOfMember(writer, validators, member, mode);
						});
					});
					writer.write("}");
				},
			),
			...minMaxProperties(schema),
		),
		isNullable,
	);
}

function combinatorValidator(
	validators: Map<string, ValidatorEntry>,
	schema: AnySchema,
	combinator: AnySchemaOrRef[],
	mode: SchemaMode,
	isNullable: boolean,
) {
	const allOfMembers = schema.allOf;

	if (allOfMembers) {
		return allOfObjectValidator(
			validators,
			schema,
			allOfMembers,
			mode,
			isNullable,
		);
	}

	const variants = combinator.map((s) =>
		schemaToValidator(validators, s, mode),
	);
	const [only, second] = variants;

	// a one-member combinator is that member. `v.union` of one option only
	// wraps its issues, and an empty list would fail every input where the
	// document constrains nothing
	if (only === undefined) {
		return maybeNullable(vcall("unknown"), isNullable);
	}

	if (second === undefined) {
		return maybeNullable(only, isNullable);
	}

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

	return maybeNullable(vcall("union", variants), isNullable);
}

function objectValidator(
	validators: Map<string, ValidatorEntry>,
	schema: AnySchema,
	mode: SchemaMode,
	isNullable: boolean,
) {
	const props = schema.properties ?? {};

	// `additionalProperties` names the schema every key outside `properties`
	// has to satisfy, so those keys are part of the contract. `true` and an
	// empty schema allow any key, and so does an absent keyword
	const restSchema =
		typeof schema.additionalProperties === "object" &&
		schema.additionalProperties !== null
			? schema.additionalProperties
			: undefined;
	const restAllowsAnything =
		restSchema !== undefined && Object.keys(restSchema).length === 0;
	const rest =
		restSchema && !restAllowsAnything
			? schemaToValidator(validators, restSchema, mode)
			: undefined;
	const allowsAnyKey = schema.additionalProperties !== false;

	if (Object.keys(props).length === 0) {
		return maybeNullable(
			maybePipe(
				vcall("record", vcall("string"), rest ?? vcall("unknown")),
				...minMaxProperties(schema),
			),
			isNullable,
		);
	}

	const requiredProps = new Set(schema.required);

	const entries = (writer: CodeBlockWriter) => {
		writer.writeLine("{");
		writer.indent(() => {
			writeStrictObjectEntries(writer, validators, props, requiredProps, mode);
		});
		writer.write("}");
	};

	return maybeNullable(
		maybePipe(
			rest
				? vcall("objectWithRest", entries, rest)
				: vcall(allowsAnyKey ? "looseObject" : "strictObject", entries),
			...minMaxProperties(schema),
		),
		isNullable,
	);
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
	const typescriptHintSchema = extensionHintSchema(schema);

	// Handle const values, added in OpenAPI 3.1
	if ("const" in schema) {
		return schema.const === null
			? vcall("null")
			: maybeNullable(
					vcall("literal", JSON.stringify(schema.const)),
					isNullable,
				);
	}

	if (schema.enum) {
		return enumValidator(schema.enum, isNullable);
	}

	if (Array.isArray(schema.type)) {
		return typeArrayValidator(
			validators,
			schema,
			schema.type,
			mode,
			isNullable,
		);
	}

	if (schema.type === "string") {
		return stringValidator(schema, mode, isNullable, typescriptHintSchema);
	}

	if (schema.type === "integer" && schema.format === "int64") {
		return int64Validator(schema, mode, isNullable, typescriptHintSchema);
	}

	if (schema.type === "number" || schema.type === "integer") {
		return numberValidator(schema, isNullable, typescriptHintSchema);
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
				schema.minItems === undefined
					? undefined
					: vcall("minLength", numericLiteral(schema.minItems)),
				schema.maxItems === undefined
					? undefined
					: vcall("maxLength", numericLiteral(schema.maxItems)),
			),
			isNullable,
		);
	}

	const combinator = schema.oneOf || schema.anyOf || schema.allOf;

	if (combinator) {
		return combinatorValidator(
			validators,
			schema,
			combinator,
			mode,
			isNullable,
		);
	}

	if (schema.type === "object" || schema.properties || !schema.type) {
		return objectValidator(validators, schema, mode, isNullable);
	}

	return schema.type === "null" ? vcall("null") : vcall("unknown");
}

export function createValibotFile(project: Project, outputDir: string) {
	const file = project.createSourceFile(
		path.join(outputDir, "valibot.ts"),
		"",
		{
			overwrite: true,
		},
	);

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
											text: JSON.stringify(schemaObject.example, undefined, 2),
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

	// Wire schema, skipped under --input-only. It parses incoming JSON with
	// bigint and number coercion. Aliases to the input schema when the type
	// lacks coercion concerns and the difference would be optional versus
	// exactOptional, which are equivalent on JSON-parsed data
	if (!inputOnly) {
		if (shouldCoerceSchema(schemaObject)) {
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

/** Coerces HTTP param strings to native values, leaving other types alone */
function asHttpParamValidator(
	validatorSchemas: Map<string, ValidatorEntry>,
	schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
): WriterFunction | string {
	if ("$ref" in schema) {
		return resolveRef(validatorSchemas, schema.$ref, "wire");
	}

	// Members of an object-valued query parameter reach the validator as
	// strings, for the same reason its scalar siblings do. They are bracket-
	// encoded into the query string, so the coercion below has to reach them
	// too. Recursion stops at a `$ref`, which resolves to the one named schema
	// emitted for the whole document and therefore lacks a query-only variant.
	// It also stops at shapes that emit more than members and items
	if (
		schema.type === "object" &&
		schema.properties &&
		Object.keys(schema.properties).length > 0 &&
		schema.additionalProperties === undefined &&
		!schemaIsNullable(schema)
	) {
		const properties = schema.properties;
		const requiredProps = new Set(schema.required);

		return vcall("looseObject", (writer: CodeBlockWriter) => {
			writer.writeLine("{");
			writer.indent(() => {
				writeStrictObjectEntries(
					writer,
					validatorSchemas,
					properties,
					requiredProps,
					"wire",
					asHttpParamValidator,
				);
			});
			writer.write("}");
		});
	}

	if (
		schema.type === "array" &&
		schema.items &&
		schema.minItems === undefined &&
		schema.maxItems === undefined &&
		!schemaIsNullable(schema)
	) {
		return vcall("array", asHttpParamValidator(validatorSchemas, schema.items));
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

type SchemaNamePair = { inputName: string; wireName: string };

type OperationSchemaNames = {
	json?: string;
	response?: string;
	param?: string;
	query?: string;
	header?: string;
};

type OperationTarget = {
	validatorSchemas: Map<string, ValidatorEntry>;
	valibotFile: SourceFile;
	commandName: string;
	inputOnly: boolean | undefined;
};

// Emits the input schema and, unless input-only, the wire schema of a segment
function emitNamePair(
	target: OperationTarget,
	segment: string,
	initializer: (mode: SchemaMode) => WriterFunction | string,
): SchemaNamePair {
	const { valibotFile, commandName, inputOnly } = target;
	const inputName = camelcase(["input", commandName, segment, "schema"]);
	const wireName = camelcase([commandName, segment, "schema"]);

	valibotFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: inputName,
				initializer: initializer("input"),
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
					initializer: initializer("wire"),
				},
			],
		});
	}

	return { inputName, wireName };
}

function emitSchemaPair(
	target: OperationTarget,
	segment: "body" | "response",
	schema: oas30.SchemaObject | oas31.SchemaObject | oas31.ReferenceObject,
) {
	return emitNamePair(target, segment, (mode) =>
		schemaToValidator(target.validatorSchemas, schema, mode),
	);
}

function parameterPropertyMap(
	validatorSchemas: Map<string, ValidatorEntry>,
	list: oas30.ParameterObject[],
	mode: SchemaMode,
	isHttpParam: boolean,
	toKey: (name: string) => string,
) {
	return Object.fromEntries(
		list.map((p) => {
			const paramSchema = p.schema ?? { type: "string" as const };
			const optionalWrapper = mode === "input" ? "optional" : "exactOptional";
			const validator =
				mode === "wire" && isHttpParam
					? asHttpParamValidator(validatorSchemas, paramSchema)
					: schemaToValidator(validatorSchemas, paramSchema, mode);

			return [
				JSON.stringify(toKey(p.name)),
				p.required ? validator : vcall(optionalWrapper, validator),
			];
		}),
	);
}

// Params/Query (Strict Objects)
function addParams(
	target: OperationTarget,
	type: "params" | "query",
	list: oas30.ParameterObject[],
) {
	const isHttpParam = type === "query";

	return emitNamePair(target, type, (mode) =>
		vcall(
			"strictObject",
			Writers.object(
				parameterPropertyMap(
					target.validatorSchemas,
					list,
					mode,
					isHttpParam,
					(name) => name,
				),
			),
		),
	);
}

// Header schema (non-strict to allow extra HTTP headers)
function addHeader(target: OperationTarget, list: oas30.ParameterObject[]) {
	return emitNamePair(target, "header", (mode) =>
		vcall(
			"object",
			Writers.object(
				parameterPropertyMap(
					target.validatorSchemas,
					list,
					mode,
					true,
					(name) => name.toLowerCase(),
				),
			),
		),
	);
}

/**
 * Creates validator schemas for operation input (body, params, query) in the
 * valibot file. Returns the schema names for use in middleware generation
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
): { input: OperationSchemaNames; wire: OperationSchemaNames } {
	const target = { validatorSchemas, valibotFile, commandName, inputOnly };

	const named = typedEntries({
		json: input.body ? emitSchemaPair(target, "body", input.body) : undefined,
		response: input.response
			? emitSchemaPair(target, "response", input.response)
			: undefined,
		param:
			input.params.length > 0
				? addParams(target, "params", input.params)
				: undefined,
		query:
			input.query.length > 0
				? addParams(target, "query", input.query)
				: undefined,
		header:
			input.header.length > 0 ? addHeader(target, input.header) : undefined,
	}).filter(
		(entry): entry is [keyof OperationSchemaNames, SchemaNamePair] =>
			entry[1] !== undefined,
	);

	return {
		input: Object.fromEntries(
			named.map(([key, names]) => [key, names.inputName]),
		),
		wire: Object.fromEntries(
			named.map(([key, names]) => [key, names.wireName]),
		),
	};
}
