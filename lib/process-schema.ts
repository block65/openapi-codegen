import type { oas30, oas31 } from "openapi3-ts";
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
import {
	iife,
	isNotNullOrUndefined,
	isNotReferenceObject,
	isReferenceObject,
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
			return undefined;
	}
}

// int64 maps to bigint, and every other integer or number maps to number
function numericType(isInt64: boolean, stringish: boolean | undefined) {
	if (isInt64) {
		// biome-ignore lint/suspicious/noTemplateCurlyInString: template literal type
		return stringish ? "`${bigint}`" : "bigint";
	}
	// biome-ignore lint/suspicious/noTemplateCurlyInString: template literal type
	return stringish ? "`${number}`" : "number";
}

function isInt64Schema(schema: oas30.SchemaObject | oas31.SchemaObject) {
	return schema.type === "integer" && schema.format === "int64";
}

function schemaTypeIsNull(schema: oas30.SchemaObject | oas31.SchemaObject) {
	return (
		schema.type === "null" ||
		("nullable" in schema && schema.nullable) ||
		schema.enum?.every((e) => e === "null")
	);
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
		writer.write("Record<string | number, ");

		if (typeof value === "function") {
			value(writer);
		} else {
			writer.write(value);
		}

		writer.write(">");
	};
}

// LiteralUnion keeps known values in completion and accepts any other string
function literalUnionType(
	schemaItems: (
		| oas31.SchemaObject
		| oas30.SchemaObject
		| oas31.ReferenceObject
	)[],
) {
	const objects = schemaItems.filter(isNotReferenceObject);

	if (objects.length !== schemaItems.length || objects.length < 2) {
		return undefined;
	}

	const bare = objects.filter((schema) => !schema.enum);
	const enums = objects.filter((schema) => schema.enum);
	const [base] = bare;

	if (bare.length !== 1 || enums.length === 0 || base?.type !== "string") {
		return undefined;
	}

	if (!enums.every((schema) => schema.type === "string")) {
		return undefined;
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

export function schemaToType(
	typesAndInterfaces: Map<
		string,
		InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration
	>,
	parentSchema: oas31.SchemaObject | oas30.SchemaObject,
	propertyName: string,
	schemaObject: oas31.SchemaObject | oas30.SchemaObject | oas31.ReferenceObject,
	options: {
		booleanAsStringish?: boolean;
		integerAsStringish?: boolean;
	} = {},
): OptionalKind<PropertySignatureStructure> {
	const name = `"${propertyName}"`;
	const hasQuestionToken =
		parentSchema.type === "object" &&
		!parentSchema.required?.includes(propertyName);

	if ("$ref" in schemaObject) {
		const existingSchema = typesAndInterfaces.get(schemaObject.$ref);

		if (!existingSchema) {
			console.warn("ref used before available: schema=%j", schemaObject);

			return {
				name,
				hasQuestionToken,
				type: "never",
				docs: [
					{
						description: `WARN: $ref used before available - schema=${JSON.stringify(schemaObject)}`,
					},
				],
			};
		}

		// Propagate JSDoc from the referenced type to the property
		const refDocs = existingSchema.getJsDocs();
		const docs: OptionalKind<JSDocStructure>[] = refDocs.flatMap((jsDoc) => {
			const description = jsDoc.getDescription();
			const tags = jsDoc
				.getTags()
				.map((tag) => {
					const text = tag.getCommentText();
					return text ? { tagName: tag.getTagName(), text } : undefined;
				})
				.filter((tag): tag is { tagName: string; text: string } => !!tag);

			if (!description && tags.length === 0) {
				return [];
			}

			return [
				{
					...(description && { description }),
					...(tags.length > 0 && { tags }),
				},
			];
		});

		return {
			name,
			hasQuestionToken,
			type: existingSchema.getName(),
			...(docs.length > 0 && { docs }),
		};
	}

	const jsdocTags = [
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

	const maybeJsDoc = {
		...(schemaObject.description && {
			description: wordWrap(`\n${schemaObject.description}`),
		}),
		...(jsdocTags.length > 0 && { tags: jsdocTags }),
	};

	const docs: (OptionalKind<JSDocStructure> | string)[] =
		Object.keys(maybeJsDoc).length > 1 ? [maybeJsDoc] : [];

	if (Array.isArray(schemaObject.type)) {
		//
		if (schemaObject.type.length === 1) {
			return {
				name,
				hasQuestionToken,
				type: maybeWithNullUnion(
					schemaObject.type[0] || "unknown", // weird edge case
					schemaTypeIsNull(schemaObject),
				),
				docs,
			};
		}

		return {
			name,
			hasQuestionToken,
			type: maybeUnion(
				...schemaObject.type.map((type) => {
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
							name,
							schema,
							options,
						).type || "never"
					);
				}),
			),
			docs,
		};
	}

	if ("const" in schemaObject) {
		return {
			name,
			hasQuestionToken,
			type: Array.isArray(schemaObject.const)
				? maybeUnion(...schemaObject.const)
				: JSON.stringify(schemaObject.const),

			docs,
		};
	}

	if (schemaObject.type === "array") {
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
				name,
				hasQuestionToken,
				type: (writer: CodeBlockWriter) => {
					writer.write("readonly ");
					writer.write("(");
					typeWriter(writer);
					writer.write(")[]");
				},
				isReadonly: !!type.isReadonly,
				docs,
			};
		}

		return {
			name,
			hasQuestionToken,
			type: `readonly (${type.type})[]`,
			isReadonly: !!type.isReadonly,
			docs,
		};
	}

	if (
		"allOf" in schemaObject ||
		"oneOf" in schemaObject ||
		"anyOf" in schemaObject
	) {
		const schemaItems =
			schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf || [];

		if (!("allOf" in schemaObject)) {
			const literalUnion = literalUnionType(schemaItems);

			if (literalUnion !== undefined) {
				return {
					name,
					hasQuestionToken,
					type: maybeWithNullUnion(
						literalUnion,
						schemaTypeIsNull(schemaObject),
					),
					docs,
				};
			}
		}

		const types = schemaItems
			.map((schema) =>
				schemaToType(
					typesAndInterfaces,
					parentSchema,
					propertyName,
					schema,
					options,
				),
			)
			.map((t) => t.type);

		const [onlyType] = types;

		// only one type, so just return that type
		if (types.length === 1 && onlyType !== undefined) {
			return {
				name,
				hasQuestionToken,
				type: onlyType,
				docs,
			};
		}

		const intersect = "allOf" in schemaObject;

		const filteredTypes = types.filter(isNotNullOrUndefined);
		const hasNullType = types.some((t) => t === "null");
		const isNullable = schemaTypeIsNull(schemaObject);

		if (intersect) {
			// For allOf, intersect the non-null types and add null when nullable
			const nonNullTypes = filteredTypes.filter((t) => t !== "null");
			const intersectionType = maybeIntersection(...nonNullTypes);

			return {
				name,
				hasQuestionToken,
				type: isNullable
					? maybeUnion(intersectionType, "null")
					: intersectionType,
				docs,
			};
		}

		// For oneOf and anyOf, union every type, adding null when nullable
		return {
			name,
			hasQuestionToken,
			type:
				hasNullType || isNullable
					? maybeUnion(...filteredTypes.filter((t) => t !== "null"), "null")
					: maybeUnion(...filteredTypes),
			docs,
		};
	}

	// A document often omits `type` from a schema that plainly describes an
	// object, so keys unique to objects stand in for it
	const describesObject =
		schemaObject.type === "object" ||
		(schemaObject.type === undefined &&
			(schemaObject.properties !== undefined ||
				schemaObject.additionalProperties !== undefined));

	if (describesObject) {
		// type=object and enum null is common openapi workaround
		// we convert it to null type
		if (schemaObject.enum?.every((e) => e === null)) {
			return {
				name,
				hasQuestionToken,
				type: "null",
				isReadonly: !!schemaObject.readOnly,
				docs,
			};
		}

		if (
			schemaObject.properties &&
			Object.keys(schemaObject.properties).length > 0
		) {
			return {
				name,
				hasQuestionToken,
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
				docs,
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
				name,
				hasQuestionToken,
				type: recordType(value.type ?? "Jsonifiable"),
				isReadonly: !!schemaObject.readOnly,
				docs,
			};
		}

		return {
			name,
			hasQuestionToken,
			type: "Record<string | number, Jsonifiable>",
			docs,
		};
	}

	if (schemaObject.type === "integer" || schemaObject.type === "number") {
		return {
			name,
			hasQuestionToken,
			type: maybeWithNullUnion(
				numericType(isInt64Schema(schemaObject), options.integerAsStringish),
				schemaTypeIsNull(schemaObject),
			),
			docs,
		};
	}

	if (schemaObject.type === "boolean") {
		return {
			name,
			hasQuestionToken,
			type: maybeWithNullUnion(
				options.booleanAsStringish
					? Writers.unionType('"true"', '"false"')
					: "boolean",
				schemaTypeIsNull(schemaObject),
			),
			docs,
		};
	}

	if (schemaObject.type === "string") {
		if ("enum" in schemaObject) {
			return {
				name,
				hasQuestionToken,
				type: maybeUnion(...schemaObject.enum.map((e) => JSON.stringify(e))),
				docs,
			};
		}

		if (
			"x-typescript-hint" in schemaObject &&
			typeof schemaObject["x-typescript-hint"] === "string"
		) {
			return {
				name,
				hasQuestionToken,
				type: schemaObject["x-typescript-hint"],
				docs,
			};
		}

		const temporal = temporalStringType(schemaObject.format);

		if (temporal) {
			return {
				name,
				hasQuestionToken,
				type: maybeWithNullUnion(temporal, schemaTypeIsNull(schemaObject)),
				docs,
			};
		}

		return {
			name,
			hasQuestionToken,
			type: "string",
			docs,
		};
	}

	// empty schemaObject
	if (Object.keys(schemaObject).length === 0) {
		return {
			name,
			hasQuestionToken,
			type: maybeWithNullUnion("Jsonifiable", schemaTypeIsNull(schemaObject)),
			docs,
			isReadonly: !!schemaObject.readOnly,
		};
	}

	if (
		schemaObject.type === "null" ||
		// legacy nullables
		("nullable" in schemaObject && schemaObject.nullable) ||
		("enum" in schemaObject && schemaObject.enum?.every((e) => e === "null"))
	) {
		return {
			name,
			hasQuestionToken,
			type: "null",
			docs,
		};
	}

	console.warn(
		"WARN: unhandled type %s in %j", // with parent %j'
		schemaObject.type,
		schemaObject,
		// parentSchema
	);

	return {
		name,
		hasQuestionToken,
		type: "unknown",
		docs,
	};
}

export function registerTypesFromSchema(
	typesAndInterfaces: Map<
		string,
		InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration
	>,
	typesFile: SourceFile,
	schemaName: string,
	schemaObject:
		| oas30.SchemaObject
		| oas30.ReferenceObject
		| oas31.SchemaObject
		| oas31.ReferenceObject,
) {
	// deal with refs
	if ("$ref" in schemaObject) {
		const iface = typesAndInterfaces.get(schemaObject.$ref);

		if (!iface) {
			throw new Error(`ref used before available: ${schemaObject.$ref}`);
		}

		const typeAlias = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			type: iface.getName(),
		});

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
	}

	// deal with unions and intersections
	else if (
		"allOf" in schemaObject ||
		"oneOf" in schemaObject ||
		"anyOf" in schemaObject
	) {
		const schemaItems =
			schemaObject.allOf || schemaObject.oneOf || schemaObject.anyOf || [];

		const intersect = "allOf" in schemaObject;

		const typeAliases = schemaItems.filter(isReferenceObject).map((s) => {
			const alias = typesAndInterfaces.get(s.$ref);
			if (!alias) {
				throw new Error(`ref used before available: ${s.$ref}`);
			}
			return alias;
		});

		const objectTypesFromNonRefSchemas = schemaItems
			.filter(isNotReferenceObject)
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
			.filter(isNotNullOrUndefined);

		const nonObjectTypesFromNonRefSchemas = schemaItems
			.filter(isNotReferenceObject)
			.filter((schema) => schema.type !== "object")
			.map((subSchemaObject) =>
				schemaToType(
					typesAndInterfaces,
					{}, // no parent schema
					schemaName,
					subSchemaObject,
				),
			)
			.filter(isNotNullOrUndefined);

		// concat and dedupe
		const typeArgs = [
			...new Set([
				...typeAliases.map((t) => t.getName()),
				...objectTypesFromNonRefSchemas,
				...nonObjectTypesFromNonRefSchemas
					.map((t) =>
						// a writer's text is unavailable here, so wrapping applies to strings
						t.isReadonly && typeof t.type === "string"
							? `Readonly<${t.type}>`
							: t.type,
					)
					.filter(isNotNullOrUndefined),
			]),
		];

		const typeAlias = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			type: intersect
				? maybeIntersection(...typeArgs)
				: maybeUnion(...typeArgs),
		});

		if (schemaObject.description) {
			typeAlias.addJsDoc({
				description: wordWrap(schemaObject.description),
			});
		}

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
	}

	// deal with type arrays, added in OpenAPI 3.1
	else if (Array.isArray(schemaObject.type)) {
		const prop = schemaToType(typesAndInterfaces, {}, schemaName, schemaObject);

		const typeAlias = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			type: prop.type || "unknown",
		});

		if (schemaObject.description) {
			typeAlias.addJsDoc({
				description: wordWrap(schemaObject.description),
			});
		}

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
	}

	// deal with const values
	else if ("const" in schemaObject) {
		const constDeclaration = typesFile.addTypeAlias({
			isExported: true,
			name: pascalCase(schemaName),
			type: JSON.stringify(schemaObject.const),
		});

		if (schemaObject.description) {
			constDeclaration.addJsDoc({
				description: wordWrap(schemaObject.description),
			});
		}

		typesAndInterfaces.set(
			`#/components/schemas/${schemaName}`,
			constDeclaration,
		);
	}

	// deal with objects
	else if (!schemaObject.type || schemaObject.type === "object") {
		const newIf = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			// Reuses the walk an inline schema takes, so a named schema and an
			// inline one of the same shape agree. It also spells the value type
			// in TypeScript, since JSON Schema names such as `integer` differ
			type:
				schemaToType(typesAndInterfaces, {}, schemaName, schemaObject).type ??
				"Record<string | number, Jsonifiable>",
		});

		if (schemaObject.description) {
			newIf.addJsDoc({
				description: wordWrap(schemaObject.description),
			});
		}

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, newIf);
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

		const stringUnion = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			type: maybeUnion(...schemaObject.enum.map((e) => JSON.stringify(e))),
			docs,
		});

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, stringUnion);
	}

	// deal with non-enum strings
	else if (schemaObject.type === "string" && !schemaObject.enum) {
		const typeAlias = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			// default
			type: maybeWithNullUnion("string", schemaTypeIsNull(schemaObject)),

			// RFC 3339 temporal formats (date, date-time, time, duration)
			...iife(() => {
				const temporal = temporalStringType(schemaObject.format);
				return temporal
					? {
							type: maybeWithNullUnion(
								temporal,
								schemaTypeIsNull(schemaObject),
							),
						}
					: {};
			}),

			// custom extension
			...("x-typescript-hint" in schemaObject &&
				typeof schemaObject["x-typescript-hint"] === "string" && {
					type: maybeWithNullUnion(
						schemaObject["x-typescript-hint"],
						schemaTypeIsNull(schemaObject),
					),
				}),
		});

		if (schemaObject.description) {
			typeAlias.addJsDoc({
				description: wordWrap(schemaObject.description),
			});
		}

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
	}

	// deal with numberish things
	else if (schemaObject.type === "number" || schemaObject.type === "integer") {
		const typeAlias = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			type: maybeWithNullUnion(
				numericType(isInt64Schema(schemaObject), false),
				schemaTypeIsNull(schemaObject),
			),
		});

		if (schemaObject.description) {
			typeAlias.addJsDoc({
				description: wordWrap(schemaObject.description),
			});
		}

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
	}

	// deal with boolean things
	else if (schemaObject.type === "boolean") {
		const typeAlias = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			type: maybeWithNullUnion(
				schemaObject.type,
				schemaTypeIsNull(schemaObject),
			),
		});

		if (schemaObject.description) {
			typeAlias.addJsDoc({
				description: wordWrap(schemaObject.description),
			});
		}

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
	}

	// deal with arrays of refs
	else if (
		schemaObject.type === "array" &&
		schemaObject.items &&
		"$ref" in schemaObject.items
	) {
		const iface = typesAndInterfaces.get(schemaObject.items.$ref);

		if (!iface) {
			throw new Error(`ref used before available: ${schemaObject.items.$ref}`);
		}

		const typeAlias = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			type: `${iface.getName()}[]`,
		});

		if (schemaObject.description) {
			typeAlias.addJsDoc({
				description: wordWrap(schemaObject.description),
			});
		}

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, typeAlias);
	} else {
		console.warn(
			`unsupported ${schemaObject.type} schema object: %j`,
			schemaObject,
		);
	}
}
