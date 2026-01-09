/* eslint-disable no-console */
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
	isNotNullOrUndefined,
	isNotReferenceObject,
	isReferenceObject,
	pascalCase,
	wordWrap,
} from "./utils.ts";

function maybeWithNullUnion(type: string | WriterFunction, withNull = false) {
	return withNull && type !== "null" ? Writers.unionType(type, "null") : type;
}

function schemaTypeIsNull(schema: oas30.SchemaObject | oas31.SchemaObject) {
	return (
		schema.type === "null" ||
		("nullable" in schema && schema.nullable) ||
		schema.enum?.every((e) => e === "null")
	);
}

function maybeUnion(...types: (string | WriterFunction)[]) {
	const [first, second, ...rest] = types;

	if (typeof first === "undefined") {
		return "unknown";
	}

	return typeof second === "undefined"
		? first
		: Writers.unionType(first, second, ...rest);
}

function maybeIntersection(...types: (string | WriterFunction)[]) {
	const [first, second, ...rest] = types;

	if (typeof first === "undefined") {
		return "unknown";
	}

	return typeof second === "undefined"
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
		exactOptionalPropertyTypes?: boolean;
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
			// throw new Error(`ref used before available: ${schemaObject.$ref}`);
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

		return {
			name,
			hasQuestionToken,
			type: existingSchema.getName(),
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
						schemaToType(typesAndInterfaces, schemaObject, name, schema).type ||
						"never"
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
		);

		if (type.type instanceof Function) {
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

		const types = schemaItems
			.map((schema) =>
				schemaToType(typesAndInterfaces, parentSchema, propertyName, schema, {
					// forcibly disallow undefined, we will handle it later
					exactOptionalPropertyTypes: true,
				}),
			)
			.map((t) => t.type);

		// only one type, so just return that type
		if (types.length === 1) {
			return {
				name,
				hasQuestionToken,
				type: `${types[0]}`,
				docs,
			};
		}

		const intersect = "allOf" in schemaObject;

		// already got a null type, no need to add another null
		if (types.some((t) => t === "null")) {
			return {
				name,
				hasQuestionToken,
				type: intersect
					? maybeIntersection(...types.filter(isNotNullOrUndefined))
					: maybeUnion(...types.filter(isNotNullOrUndefined)),
				docs,
			};
		}

		// add null
		return {
			name,
			hasQuestionToken,
			type: intersect
				? maybeIntersection(...types.filter(isNotNullOrUndefined), "null")
				: maybeUnion(...types.filter(isNotNullOrUndefined), "null"),
			docs,
		};
	}

	if (schemaObject.type === "object") {
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

		if (schemaObject.properties) {
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
			"type" in schemaObject.additionalProperties
		) {
			return {
				name,
				hasQuestionToken,
				type: "Record<string | number, /* additionalProperties is not handled yet */ unknown> ",
				isReadonly: !!schemaObject.readOnly,
			};
		}

		return {
			name,
			hasQuestionToken,
			// WARN: Duplicated code - the recursion beat me
			type: "Record<string | number, Jsonifiable>",
			docs,
		};
	}

	if (schemaObject.type === "integer" || schemaObject.type === "number") {
		return {
			name,
			hasQuestionToken,
			type: maybeWithNullUnion(
				// eslint-disable-next-line no-template-curly-in-string
				// biome-ignore lint/suspicious/noTemplateCurlyInString: intentional
				options.integerAsStringish ? "`${number}`" : "number",
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
		"WARN: unhandled type %s in %j", // with parent %j',
		schemaObject.type,
		schemaObject,
		// parentSchema,
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
					.map((t) => (t.isReadonly ? `Readonly<${t.type}>` : t.type))
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

	// deal with objects
	else if (!schemaObject.type || schemaObject.type === "object") {
		const newIf = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			// WARN: Duplicated code - the recursion beat me
			type: schemaObject.properties
				? Writers.objectType({
						properties: Object.entries(schemaObject.properties).map(
							([key, schema]) => {
								const type = schemaToType(
									typesAndInterfaces,
									schemaObject,
									key,
									schema,
								);

								return type;
							},
						),
					})
				: typeof schemaObject.additionalProperties === "object" &&
						"type" in schemaObject.additionalProperties
					? `Record<string, ${schemaObject.additionalProperties.type === "array" ? "unknown[]" : schemaObject.additionalProperties.type}>`
					: "Record<string | number, Jsonifiable>",
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

		// bonus enum interface for the same set of strings
		// handy for looping over the enum values
		// const enumDeclaration = typesFile.addEnum({
		//   name: pascalCase(schemaName, 'Enum'),
		//   isExported: true,
		//   members: schemaObject.enum.map((e: unknown) => ({
		//     name: typeof e === 'string' ? pascalCase(e) : String(e),
		//     value: String(e),
		//   })),
		// });

		const stringUnion = typesFile.addTypeAlias({
			name: pascalCase(schemaName /* , schemaObject.type */),
			isExported: true,
			type: maybeUnion(
				// enumDeclaration.getName(),
				...schemaObject.enum.map((e) => JSON.stringify(e)),
			),
			docs,
		});

		typesAndInterfaces.set(`#/components/schemas/${schemaName}`, stringUnion);

		// typesAndInterfaces.set(
		//   `#/components/schemas/${enumDeclaration.getName()}`,
		//   enumDeclaration,
		// );
	}

	// deal with string consts
	else if (schemaObject.type === "string" && "const" in schemaObject) {
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

	// deal with non-enum strings
	else if (schemaObject.type === "string" && !schemaObject.enum) {
		const typeAlias = typesFile.addTypeAlias({
			name: pascalCase(schemaName),
			isExported: true,
			// default
			type: maybeWithNullUnion("string", schemaTypeIsNull(schemaObject)),

			// date format
			...(schemaObject.format === "date-time" && {
				type: "Jsonify<Date>",
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
			type: maybeWithNullUnion("number", schemaTypeIsNull(schemaObject)),
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
	}

	// not supported yet
	else {
		console.warn(
			`unsupported ${schemaObject.type} schema object: %j`,
			schemaObject,
		);
		// throw new Error(`unsupported type "${schemaObject.type}"`);
	}
}
