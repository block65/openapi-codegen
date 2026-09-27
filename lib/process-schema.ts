import type { oas30, oas32 } from "openapi3-ts";
import {
	type CodeBlockWriter,
	type EnumDeclaration,
	type InterfaceDeclaration,
	type JSDocStructure,
	type OptionalKind,
	type PropertySignatureStructure,
	type SourceFile,
	type TypeAliasDeclaration,
	type WriterFunction,
	Writers,
} from "ts-morph";
import { chunkOf } from "./chunks.ts";
import { schemaNameOf, schemaRef } from "./refs.ts";
import {
	type SchemaNode,
	type SchemaObject,
	isNotNullOrUndefined,
	isReferenceObject,
	isSchemaObject,
	pascalCase,
	wordWrap,
} from "./utils.ts";

function maybeWithNullUnion(type: string | WriterFunction, withNull = false) {
	return withNull && type !== "null" ? Writers.unionType(type, "null") : type;
}

// Template-literal type per RFC 3339 temporal format, mirrored in valibot
function temporalStringType(format: string | undefined) {
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

// int64 maps to bigint, and every other integer or number maps to number
function numericType(isInt64: boolean, stringish: boolean | undefined) {
	// int64 reaches past Number.MAX_SAFE_INTEGER, and query, header, path and
	// body values arrive as strings, hence the `${bigint}` wire form
	if (isInt64) {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: template literal type
		return stringish ? "`${bigint}`" : "bigint";
	}
	// biome-ignore lint/suspicious/noTemplateCurlyInString: template literal type
	return stringish ? "`${number}`" : "number";
}

function isInt64Schema(schema: SchemaObject) {
	return schema.type === "integer" && schema.format === "int64";
}

function schemaTypeIsNull(schema: SchemaObject) {
	return (
		schema.type === "null" ||
		("nullable" in schema && schema.nullable) ||
		schema.enum?.every((e) => e === "null")
	);
}

// valibot wraps every nullable schema in v.nullable, so the type admits null
function withNullable<T extends { type: string | WriterFunction }>(
	schema: SchemaObject,
	result: T,
) {
	return {
		...result,
		type: maybeWithNullUnion(result.type, schemaTypeIsNull(schema)),
	};
}

// Drops `unknown`, `never` and duplicate string members from a union
function collapseUnion(types: (string | WriterFunction)[]) {
	const seen = new Set<string>();
	const deduped = types.filter((type) => {
		if (typeof type !== "string") {
			return true;
		}

		if (seen.has(type)) {
			return false;
		}

		seen.add(type);

		return true;
	});

	if (deduped.includes("unknown")) {
		return ["unknown"];
	}

	const meaningful = deduped.filter((type) => type !== "never");

	return meaningful.length > 0 ? meaningful : deduped.slice(0, 1);
}

function maybeUnion(...types: (string | WriterFunction)[]) {
	const [first, second, ...rest] = collapseUnion(types);

	if (first === undefined) {
		return "unknown";
	}

	return second === undefined
		? first
		: Writers.unionType(first, second, ...rest);
}

function recordType(value: string | WriterFunction) {
	return (writer: CodeBlockWriter) => {
		writer.write("Record<string, ");

		if (typeof value === "function") {
			value(writer);
		} else {
			writer.write(value);
		}

		writer.write(">");
	};
}

// LiteralUnion keeps known values in completion and accepts any other string
function literalUnionType(maybeSchemaObjects: SchemaNode[]) {
	const schemaObjects = maybeSchemaObjects.filter((obj) => isSchemaObject(obj));

	if (
		schemaObjects.length !== maybeSchemaObjects.length ||
		schemaObjects.length < 2
	) {
		return;
	}

	const bare = schemaObjects.filter((schema) => !schema.enum);
	const enums = schemaObjects.filter((schema) => schema.enum);
	const [base] = bare;

	if (bare.length !== 1 || enums.length === 0 || base?.type !== "string") {
		return;
	}

	if (!enums.every((schema) => schema.type === "string")) {
		return;
	}

	const values = [
		...new Set(
			enums
				.flatMap((schema) => schema.enum ?? [])
				.filter((value) => typeof value === "string"),
		),
	].map((value) => JSON.stringify(value));

	return values.length > 0
		? `LiteralUnion<${values.join(" | ")}, string>`
		: undefined;
}

function maybeIntersection(...types: (string | WriterFunction)[]) {
	const [first, second, ...rest] = types;

	if (first === undefined) {
		return "unknown";
	}

	return second === undefined
		? first
		: Writers.intersectionType(first, second, ...rest);
}

type TypesAndInterfaces = Map<
	string,
	InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration
>;

type SchemaToTypeOptions = {
	booleanAsStringish?: boolean;
	integerAsStringish?: boolean;
};

// Propagates JSDoc from the referenced type to the property
function refPropertyDocs(
	existingSchema: InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration,
) {
	const refDocs = existingSchema.getJsDocs();
	const docs: OptionalKind<JSDocStructure>[] = refDocs
		.map((jsDoc) => {
			const description = jsDoc.getDescription();
			const tags = jsDoc
				.getTags()
				.map((tag) => {
					const text = tag.getCommentText();
					return text ? { tagName: tag.getTagName(), text } : undefined;
				})
				.filter((tag): tag is { tagName: string; text: string } => !!tag);

			if (tags.length > 0) {
				return description ? { description, tags } : { tags };
			}

			return description ? { description } : {};
		})
		// an empty JSDoc block maps to {}
		.filter((doc) => Object.keys(doc).length > 0);

	return docs;
}

function refType(
	typesAndInterfaces: TypesAndInterfaces,
	schemaObject: oas32.ReferenceObject,
) {
	const existingSchema = typesAndInterfaces.get(schemaObject.$ref);
	const docs = existingSchema ? refPropertyDocs(existingSchema) : [];

	const property: Pick<
		OptionalKind<PropertySignatureStructure>,
		"type" | "docs"
	> = {
		type: typeNameOf(typesAndInterfaces, schemaObject.$ref),
		...(docs.length > 0 && { docs }),
	};

	return property;
}

function schemaJsDocTags(schemaObject: SchemaObject) {
	return [
		...(schemaObject.default
			? [{ tagName: "default", text: String(schemaObject.default) }]
			: []),
		...(schemaObject.enum
			? [{ tagName: "enum", text: schemaObject.enum.join(",") }]
			: []),
		...(schemaObject.externalDocs
			? [
					{
						tagName: "see",
						text: wordWrap(
							[
								schemaObject.externalDocs.description,
								schemaObject.externalDocs.url,
							]
								.filter(Boolean)
								.join(" - "),
						),
					},
				]
			: []),

		// 3
		...("example" in schemaObject
			? [{ tagName: "example", text: String(schemaObject.example) }]
			: []),

		// 3.1
		...("examples" in schemaObject
			? schemaObject.examples.map((example) => ({
					tagName: "example",
					text: JSON.stringify(example),
				}))
			: []),
		...(schemaObject.deprecated ? [{ tagName: "deprecated" }] : []),
	];
}

function schemaDocs(schemaObject: SchemaObject) {
	const jsdocTags = schemaJsDocTags(schemaObject);

	const maybeJsDoc = {
		...(schemaObject.description && {
			description: wordWrap(`\n${schemaObject.description}`),
		}),
		...(jsdocTags.length > 0 && { tags: jsdocTags }),
	};

	const docs: (OptionalKind<JSDocStructure> | string)[] =
		Object.keys(maybeJsDoc).length > 1 ? [maybeJsDoc] : [];

	return docs;
}

function typeArrayType(
	typesAndInterfaces: TypesAndInterfaces,
	schemaObject: SchemaObject,
	propertyName: string,
	types: (oas32.SchemaObjectType | oas30.SchemaObjectType)[],
	options: SchemaToTypeOptions,
) {
	if (types.length === 1) {
		return maybeWithNullUnion(
			types[0] || "unknown", // weird edge case
			schemaTypeIsNull(schemaObject),
		);
	}

	return maybeUnion(
		...types.map((type) => {
			const schema =
				type === "array"
					? ({
							items: {},
							...schemaObject,
							type: "array",
						} satisfies typeof schemaObject)
					: ({
							...schemaObject,
							type,
						} satisfies typeof schemaObject);

			return (
				schemaToType(
					typesAndInterfaces,
					schemaObject,
					`"${propertyName}"`,
					schema,
					options,
				).type || "never"
			);
		}),
	);
}

function arrayType(
	typesAndInterfaces: TypesAndInterfaces,
	propertyName: string,
	schemaObject: SchemaObject,
	options: SchemaToTypeOptions,
) {
	const type = schemaToType(
		typesAndInterfaces,
		schemaObject,
		propertyName,
		schemaObject.items || {},
		options,
	);

	if (typeof type.type === "function") {
		const typeWriter = type.type;

		return {
			type: (writer: CodeBlockWriter) => {
				writer.write("readonly ");
				writer.write("(");
				typeWriter(writer);
				writer.write(")[]");
			},
			isReadonly: !!type.isReadonly,
		};
	}

	return {
		type: `readonly (${type.type})[]`,
		isReadonly: !!type.isReadonly,
	};
}

function combinatorType(
	typesAndInterfaces: TypesAndInterfaces,
	parentSchema: SchemaObject,
	propertyName: string,
	schemaObject: SchemaObject,
	options: SchemaToTypeOptions,
) {
	const schemaItems =
		schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf || [];

	if (!("allOf" in schemaObject)) {
		const literalUnion = literalUnionType(schemaItems);

		if (literalUnion !== undefined) {
			return maybeWithNullUnion(literalUnion, schemaTypeIsNull(schemaObject));
		}
	}

	// a member's `nullable` joins the combinator's own null below, so the
	// member types stay free of it
	const nullableMembers = schemaItems.filter(
		(schema) =>
			isSchemaObject(schema) && "nullable" in schema && schema.nullable,
	);

	const types = schemaItems
		.map((schema) =>
			schemaToType(
				typesAndInterfaces,
				parentSchema,
				propertyName,
				isSchemaObject(schema) && nullableMembers.includes(schema)
					? { ...schema, nullable: false }
					: schema,
				options,
			),
		)
		.map((t) => t.type);

	const [onlyType] = types;
	const intersect = "allOf" in schemaObject;

	// an intersection admits null when every member does
	const membersNullable = intersect
		? nullableMembers.length === schemaItems.length
		: nullableMembers.length > 0;

	// only one type, so just return that type
	if (types.length === 1 && onlyType !== undefined) {
		return maybeWithNullUnion(
			onlyType,
			membersNullable || schemaTypeIsNull(schemaObject),
		);
	}

	const filteredTypes = types.filter((value) => isNotNullOrUndefined(value));
	const hasNullType = types.some((t) => t === "null");
	const isNullable = membersNullable || schemaTypeIsNull(schemaObject);

	if (intersect) {
		// For allOf, intersect the non-null types and add null when nullable
		const nonNullTypes = filteredTypes.filter((t) => t !== "null");
		const intersectionType = maybeIntersection(...nonNullTypes);

		return isNullable ? maybeUnion(intersectionType, "null") : intersectionType;
	}

	// For oneOf and anyOf, union every type, adding null when nullable
	return hasNullType || isNullable
		? maybeUnion(...filteredTypes.filter((t) => t !== "null"), "null")
		: maybeUnion(...filteredTypes);
}

// Keys unique to objects stand in for the `type` a document often omits
function isObjectSchema(schemaObject: SchemaObject) {
	return (
		schemaObject.type === "object" ||
		(schemaObject.type === undefined &&
			(schemaObject.properties !== undefined ||
				schemaObject.additionalProperties !== undefined))
	);
}

function objectType(
	typesAndInterfaces: TypesAndInterfaces,
	propertyName: string,
	schemaObject: SchemaObject,
	options: SchemaToTypeOptions,
) {
	// type=object and enum null is common openapi workaround
	// we convert it to null type
	if (schemaObject.enum?.every((e) => e === null)) {
		return {
			type: "null",
			isReadonly: !!schemaObject.readOnly,
		};
	}

	if (
		schemaObject.properties &&
		Object.keys(schemaObject.properties).length > 0
	) {
		return {
			type: Writers.objectType({
				properties: Object.entries(schemaObject.properties).map(
					([key, schema]) => {
						const type = schemaToType(
							typesAndInterfaces,
							schemaObject,
							key,
							schema,
							options,
						);

						return type;
					},
				),
			}),
		};
	}

	if (
		typeof schemaObject.additionalProperties === "object" &&
		schemaObject.additionalProperties !== null
	) {
		// A record value is always present, so it stays required and the
		// parent contributes an empty set of keys
		const value = schemaToType(
			typesAndInterfaces,
			{},
			propertyName,
			schemaObject.additionalProperties,
			options,
		);

		return {
			type: recordType(value.type ?? "JsonValue"),
			isReadonly: !!schemaObject.readOnly,
		};
	}

	return {
		type: "Record<string, JsonValue>",
	};
}

function stringType(schemaObject: SchemaObject) {
	if ("enum" in schemaObject) {
		return maybeUnion(...schemaObject.enum.map((e) => JSON.stringify(e)));
	}

	if (
		"x-typescript-hint" in schemaObject &&
		typeof schemaObject["x-typescript-hint"] === "string"
	) {
		return schemaObject["x-typescript-hint"];
	}

	const temporal = temporalStringType(schemaObject.format);

	return temporal ?? "string";
}

function schemaObjectType(
	typesAndInterfaces: TypesAndInterfaces,
	parentSchema: SchemaObject,
	propertyName: string,
	schemaObject: SchemaObject,
	options: SchemaToTypeOptions,
) {
	if (Array.isArray(schemaObject.type)) {
		return {
			type: typeArrayType(
				typesAndInterfaces,
				schemaObject,
				propertyName,
				schemaObject.type,
				options,
			),
		};
	}

	if ("const" in schemaObject) {
		return {
			type: Array.isArray(schemaObject.const)
				? maybeUnion(...schemaObject.const)
				: JSON.stringify(schemaObject.const),
		};
	}

	if (schemaObject.type === "array") {
		return withNullable(
			schemaObject,
			arrayType(typesAndInterfaces, propertyName, schemaObject, options),
		);
	}

	if (
		"allOf" in schemaObject ||
		"oneOf" in schemaObject ||
		"anyOf" in schemaObject
	) {
		return {
			type: combinatorType(
				typesAndInterfaces,
				parentSchema,
				propertyName,
				schemaObject,
				options,
			),
		};
	}

	if (isObjectSchema(schemaObject)) {
		return withNullable(
			schemaObject,
			objectType(typesAndInterfaces, propertyName, schemaObject, options),
		);
	}

	if (schemaObject.type === "integer" || schemaObject.type === "number") {
		return {
			type: maybeWithNullUnion(
				numericType(isInt64Schema(schemaObject), options.integerAsStringish),
				schemaTypeIsNull(schemaObject),
			),
		};
	}

	if (schemaObject.type === "boolean") {
		return {
			type: maybeWithNullUnion(
				options.booleanAsStringish
					? Writers.unionType('"true"', '"false"')
					: "boolean",
				schemaTypeIsNull(schemaObject),
			),
		};
	}

	if (schemaObject.type === "string") {
		return withNullable(schemaObject, { type: stringType(schemaObject) });
	}

	// empty schemaObject
	if (Object.keys(schemaObject).length === 0) {
		return {
			type: maybeWithNullUnion("JsonValue", schemaTypeIsNull(schemaObject)),
			isReadonly: !!schemaObject.readOnly,
		};
	}

	if (
		schemaObject.type === "null" ||
		// legacy nullables
		("nullable" in schemaObject && schemaObject.nullable) ||
		("enum" in schemaObject && schemaObject.enum?.every((e) => e === "null"))
	) {
		return { type: "null" };
	}

	console.warn(
		"WARN: unhandled type %s in %j", // with parent %j'
		schemaObject.type,
		schemaObject,
		// parentSchema
	);

	return { type: "unknown" };
}

export function schemaToType(
	typesAndInterfaces: Map<
		string,
		InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration
	>,
	parentSchema: SchemaObject,
	propertyName: string,
	schemaNode: SchemaNode,
	options: {
		booleanAsStringish?: boolean;
		integerAsStringish?: boolean;
	} = {},
): OptionalKind<PropertySignatureStructure> {
	const name = `"${propertyName}"`;
	const hasQuestionToken =
		isObjectSchema(parentSchema) &&
		!parentSchema.required?.includes(propertyName);

	// the false schema admits no value
	if (schemaNode === false) {
		return { name, hasQuestionToken, type: "never" };
	}

	// the true schema admits any value, as the empty schema does
	const schemaObject = schemaNode === true ? {} : schemaNode;

	if (isReferenceObject(schemaObject)) {
		const property: OptionalKind<PropertySignatureStructure> = {
			name,
			hasQuestionToken,
			...refType(typesAndInterfaces, schemaObject),
		};

		return property;
	}

	const docs = schemaDocs(schemaObject);

	const property: OptionalKind<PropertySignatureStructure> = {
		name,
		hasQuestionToken,
		...schemaObjectType(
			typesAndInterfaces,
			parentSchema,
			propertyName,
			schemaObject,
			options,
		),
		docs,
	};

	return property;
}

// a recursive schema names an alias that is declared later
function typeNameOf(typesAndInterfaces: TypesAndInterfaces, ref: string) {
	return (
		typesAndInterfaces.get(ref)?.getName() ?? pascalCase(schemaNameOf(ref))
	);
}

function registerAlias(
	typesAndInterfaces: TypesAndInterfaces,
	typesFile: SourceFile,
	schemaName: string,
	type: string | WriterFunction,
	description?: string,
) {
	const typeAlias = chunkOf(typesFile).addTypeAlias({
		name: pascalCase(schemaName),
		isExported: true,
		type,
	});

	if (description) {
		typeAlias.addJsDoc({
			description: wordWrap(description),
		});
	}

	typesAndInterfaces.set(schemaRef(schemaName), typeAlias);
}

function combinatorAliasType(
	typesAndInterfaces: TypesAndInterfaces,
	schemaName: string,
	schemaObject: SchemaObject,
) {
	const schemaItems =
		schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf || [];

	const intersect = "allOf" in schemaObject;

	const typeAliases = schemaItems
		.filter((value) => isReferenceObject(value))
		.map((s) => typeNameOf(typesAndInterfaces, s.$ref));

	const objectTypesFromNonRefSchemas = schemaItems
		.filter((value) => isSchemaObject(value))
		.filter((schema) => schema.type === "object")
		.map((subSchemaObject) =>
			Writers.objectType({
				properties: Object.entries(subSchemaObject.properties || {}).map(
					([propertyName, propertySchema]) =>
						schemaToType(
							typesAndInterfaces,
							subSchemaObject,
							propertyName,
							propertySchema,
						),
				),
			}),
		)
		.filter((value) => isNotNullOrUndefined(value));

	const nonObjectTypesFromNonRefSchemas = schemaItems
		.filter((value) => isSchemaObject(value))
		.filter((schema) => schema.type !== "object")
		.map((subSchemaObject) =>
			schemaToType(
				typesAndInterfaces,
				{}, // no parent schema
				schemaName,
				subSchemaObject,
			),
		)
		.filter((value) => isNotNullOrUndefined(value));

	// concat and dedupe
	const typeArgs = [
		...new Set([
			...typeAliases,
			...objectTypesFromNonRefSchemas,
			...nonObjectTypesFromNonRefSchemas
				.map((t) =>
					// a writer's text is unavailable here, so wrapping applies to strings
					t.isReadonly && typeof t.type === "string"
						? `Readonly<${t.type}>`
						: t.type,
				)
				.filter((value) => isNotNullOrUndefined(value)),
		]),
	];

	return intersect ? maybeIntersection(...typeArgs) : maybeUnion(...typeArgs);
}

function stringAliasType(schemaObject: SchemaObject) {
	// custom extension
	if (
		"x-typescript-hint" in schemaObject &&
		typeof schemaObject["x-typescript-hint"] === "string"
	) {
		return maybeWithNullUnion(
			schemaObject["x-typescript-hint"],
			schemaTypeIsNull(schemaObject),
		);
	}

	// RFC 3339 temporal formats (date, date-time, time, duration)
	const temporal = temporalStringType(schemaObject.format);

	return maybeWithNullUnion(
		temporal || "string",
		schemaTypeIsNull(schemaObject),
	);
}

export function registerTypesFromSchema(
	typesAndInterfaces: Map<
		string,
		InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration
	>,
	typesFile: SourceFile,
	schemaName: string,
	schemaNode: SchemaNode,
) {
	const register = (type: string | WriterFunction, description?: string) =>
		registerAlias(typesAndInterfaces, typesFile, schemaName, type, description);

	if (typeof schemaNode === "boolean") {
		register(schemaNode ? "JsonValue" : "never");

		return;
	}

	const schemaObject = schemaNode;

	// deal with refs
	if ("$ref" in schemaObject) {
		register(typeNameOf(typesAndInterfaces, schemaObject.$ref));
	}

	// deal with unions and intersections
	else if (
		"allOf" in schemaObject ||
		"oneOf" in schemaObject ||
		"anyOf" in schemaObject
	) {
		register(
			combinatorAliasType(typesAndInterfaces, schemaName, schemaObject),
			schemaObject.description,
		);
	}

	// deal with type arrays, added in OpenAPI 3.1
	else if (Array.isArray(schemaObject.type)) {
		register(
			schemaToType(typesAndInterfaces, {}, schemaName, schemaObject).type ||
				"unknown",
			schemaObject.description,
		);
	}

	// deal with const values
	else if ("const" in schemaObject) {
		register(JSON.stringify(schemaObject.const), schemaObject.description);
	}

	// deal with objects
	else if (!schemaObject.type || schemaObject.type === "object") {
		// Reuses the walk an inline schema takes, so a named schema and an
		// inline one of the same shape agree. It also spells the value type
		// in TypeScript, since JSON Schema names such as `integer` differ
		register(
			schemaToType(typesAndInterfaces, {}, schemaName, schemaObject).type ??
				"Record<string, JsonValue>",
			schemaObject.description,
		);
	}

	// deal with enums
	else if (schemaObject.type === "string" && schemaObject.enum) {
		const docs = schemaObject.description
			? [
					{
						description: wordWrap(schemaObject.description),
					},
				]
			: [];

		const stringUnion = chunkOf(typesFile).addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			type: maybeUnion(...schemaObject.enum.map((e) => JSON.stringify(e))),
			docs,
		});

		typesAndInterfaces.set(schemaRef(schemaName), stringUnion);
	}

	// deal with non-enum strings
	else if (schemaObject.type === "string" && !schemaObject.enum) {
		register(stringAliasType(schemaObject), schemaObject.description);
	}

	// deal with numberish things
	else if (schemaObject.type === "number" || schemaObject.type === "integer") {
		register(
			maybeWithNullUnion(
				numericType(isInt64Schema(schemaObject), false),
				schemaTypeIsNull(schemaObject),
			),
			schemaObject.description,
		);
	}

	// deal with boolean things
	else if (schemaObject.type === "boolean") {
		register(
			maybeWithNullUnion(schemaObject.type, schemaTypeIsNull(schemaObject)),
			schemaObject.description,
		);
	}

	// deal with arrays of refs
	else if (
		schemaObject.type === "array" &&
		isReferenceObject(schemaObject.items)
	) {
		register(
			`${typeNameOf(typesAndInterfaces, schemaObject.items.$ref)}[]`,
			schemaObject.description,
		);
	} else {
		console.warn(
			`unsupported ${schemaObject.type} schema object: %j`,
			schemaObject,
		);
	}
}
