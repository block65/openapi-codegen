import { join } from "node:path";
import { $RefParser } from "@apidevtools/json-schema-ref-parser";
import type { QueryParamSpec } from "@block65/rest-client";
import type { oas30, oas31 } from "openapi3-ts";
import toposort from "toposort";
import {
	type InterfaceDeclaration,
	type JSDocStructure,
	Node,
	type OptionalKind,
	Project,
	Scope,
	StructureKind,
	SyntaxKind,
	type TypeAliasDeclaration,
	VariableDeclarationKind,
	Writers,
} from "ts-morph";
import type { Simplify } from "type-fest";
import {
	addSchemaImportsToHonoFile,
	createHonoFile,
	createHonoMiddleware,
} from "./hono.ts";
import { registerTypesFromSchema, schemaToType } from "./process-schema.ts";
import {
	camelCase,
	castToValidJsIdentifier,
	getDependents,
	iife,
	pascalCase,
	wordWrap,
} from "./utils.ts";
import {
	createValibotFile,
	createValidatorForOperationInput,
	registerValidatorFromSchema,
} from "./valibot.ts";

export type CodegenOptions = {
	/**
	 * Emit only `input*` variants, which use `v.optional` and skip wire
	 * coercion. Suits consumers that stay in memory and never reach hono
	 * middleware or response parsing
	 */
	inputOnly?: boolean;
};

type OperationMiddlewareInfo = {
	exportName: string;
	schemas: {
		json?: string;
		response?: string;
		param?: string;
		query?: string;
		header?: string;
	};
	queryParams: QueryParamSpec[];
};

// keyed by the union, so a style added or dropped fails here
const queryStyles: Record<QueryParamSpec["style"], true> = {
	form: true,
	spaceDelimited: true,
	pipeDelimited: true,
	deepObject: true,
};

function isQueryStyle(style: string): style is QueryParamSpec["style"] {
	return Object.hasOwn(queryStyles, style);
}

// OAS 3.2 added this location, so the 3.0 union this generator reads omits it
function isQuerystringLocation(location: string) {
	return location === "querystring";
}

// Resolves the OAS 3.2 §4.12.6 style and explode defaults for a parameter
function queryParameterEncoding(parameter: oas30.ParameterObject) {
	// OpenAPI defaults `style` to `form`, and `explode` to true for `form` and
	// false elsewhere. OAS 3.2 marks `explode` n/a for `deepObject`, so it is
	// normalised to true here and both sides of the generated code ignore it
	const style =
		parameter.style !== undefined && isQueryStyle(parameter.style)
			? parameter.style
			: "form";

	return {
		style,
		explode:
			style === "deepObject" ? true : (parameter.explode ?? style === "form"),
		declared: parameter.style !== undefined || parameter.explode !== undefined,
	};
}

function queryParameterSpec(
	parameter: oas30.ParameterObject,
): QueryParamSpec | undefined {
	const schema: oas30.SchemaObject =
		parameter.schema !== undefined && !("$ref" in parameter.schema)
			? parameter.schema
			: {};
	const { style, explode } = queryParameterEncoding(parameter);

	if (schema.type === "array") {
		return { name: parameter.name, type: "array", style, explode };
	}

	if (schema.type === "object" || schema.properties) {
		return {
			name: parameter.name,
			type: "object",
			style,
			explode,
			members: Object.keys(schema.properties ?? {}),
		};
	}

	// a scalar arrives as the string it was sent as, under every style
	return undefined;
}

// Warns on style and explode combinations that OAS 3.2 §4.12.6 marks n/a
function warnOnUndefinedCombination(operationId: string, spec: QueryParamSpec) {
	const undefinedCombination =
		(spec.style === "spaceDelimited" || spec.style === "pipeDelimited") &&
		spec.explode;

	if (undefinedCombination) {
		console.warn(
			`${operationId}: query parameter "${spec.name}" combines \`style: ${spec.style}\` with \`explode: true\`, which OpenAPI marks n/a and leaves undefined. Set \`explode: false\`, or use \`style: form\`.`,
		);
	}

	if (spec.style === "deepObject" && spec.type === "array") {
		console.warn(
			`${operationId}: query parameter "${spec.name}" is an array with \`style: deepObject\`, which OpenAPI marks n/a and leaves undefined. Use \`style: form\`.`,
		);
	}
}

// Warns when an object query parameter omits style and falls back to form
function warnOnUnderspecifiedQuery(
	operationId: string,
	parameters: oas30.ParameterObject[],
) {
	const seen = new Map<string, string>();

	for (const parameter of parameters) {
		const spec = queryParameterSpec(parameter);

		if (spec) {
			warnOnUndefinedCombination(operationId, spec);
		}

		if (spec?.type !== "object") {
			continue;
		}

		if (!queryParameterEncoding(parameter).declared) {
			console.warn(
				`${operationId}: query parameter "${parameter.name}" is an object but declares no \`style\`, so OpenAPI's default (form, explode) applies and its members are sent without the "${parameter.name}" prefix. Declare \`style: deepObject\` if the server expects ${parameter.name}[member]=value.`,
			);
		}

		for (const member of spec.members ?? []) {
			const owner = seen.get(member);

			if (owner) {
				console.warn(
					`${operationId}: query parameters "${owner}" and "${parameter.name}" both send a member named "${member}" without the parent name, so the request cannot be read back unambiguously. Declare \`style: deepObject\` on both.`,
				);
			} else {
				seen.set(member, parameter.name);
			}
		}
	}
}

const neverKeyword = "never" as const;

const unspecifiedKeyword = "unknown" as const;
function isUnspecifiedKeyword(type: TypeAliasDeclaration) {
	return type?.getTypeNode()?.getKindName() === unspecifiedKeyword;
}

const emptyKeyword = "undefined" as const;

// the union/intersect helpers keep TypeScript happy due to ts-morph typings
function createIntersection(...types: (string | undefined)[]) {
	// create a type  of all the inputs
	const [type1, type2, ...typeX] = types.filter((t): t is string => !!t);
	return (
		(type1 && type2
			? Writers.intersectionType(type1, type2, ...typeX)
			: type1) || neverKeyword
	);
}

// the union/intersect helpers keep TypeScript happy due to ts-morph typings
function createUnion(...types: (string | undefined)[]) {
	// create a type  of all the inputs
	const [type1, type2, ...typeX] = [
		...new Set(types.filter((t): t is string => !!t)),
	].toSorted((a, b) => a.localeCompare(b));
	return (
		(type1 && type2 ? Writers.unionType(type1, type2, ...typeX) : type1) ||
		neverKeyword
	);
}

export async function processOpenApiDocument(
	outputDir: string,
	schema: Simplify<oas31.OpenAPIObject>,
	tags?: string[],
	options?: CodegenOptions,
) {
	const project = new Project();

	const commandsFile = project.createSourceFile(
		join(outputDir, "commands.ts"),
		"",
		{
			overwrite: true,
		},
	);

	// Subclasses that attach `static responseSchema`. Consumers import from
	// this module to opt into runtime response validation, or alias
	// `./commands` to it in dev. The base command module imports zero
	// schemas, so prod bundles stay small
	const commandsValidatedFile = project.createSourceFile(
		join(outputDir, "commands-validated.ts"),
		"",
		{
			overwrite: true,
		},
	);

	const typesFile = project.createSourceFile(
		join(outputDir, "types.ts"),
		"",

		{
			overwrite: true,
		},
	);

	const mainFile = project.createSourceFile(join(outputDir, "main.ts"), "", {
		overwrite: true,
	});

	// Enums file for runtime enum values
	const enumsFile = project.createSourceFile(join(outputDir, "enums.ts"), "", {
		overwrite: true,
	});

	// Validators file for Valibot schemas
	const valibotFile = createValibotFile(project, outputDir);

	// Track registered validators by their $ref path
	const validators = new Map<string, { input: string; wire: string }>();

	// Track all operations for middleware generation
	const allOperations: OperationMiddlewareInfo[] = [];

	const outputTypes = new Set<
		InterfaceDeclaration | TypeAliasDeclaration | string
	>();

	// Input type-arg expressions used in `Command<I, …>` per operation. The
	// client's `<AllInputs, …>` union is built from these so commands from
	// other generated clients fail the constraint on `.json()`
	const inputTypeArgs = new Set<string>();

	// Bare type names referenced by `inputTypeArgs` expressions, collected at
	// the source where they are still separate from the wrapped strings
	const inputTypeNames = new Set<string>();

	const refs = await $RefParser.resolve(schema);

	commandsFile.addImportDeclaration({
		namedImports: [
			// command classes
			"Command",
			"stripUndefined",
			"jsonStringify",
		],
		moduleSpecifier: "@block65/rest-client",
	});

	commandsFile.addFunction({
		name: "encodePath",
		docs: [
			{
				description: wordWrap(
					"Tagged template literal that applies encodeURIComponent to all interpolated values, protecting path integrity from characters like `/` and `#`.",
				),
				tags: [
					{
						tagName: "example",
						text: 'encodePath`/users/${userId}` // "/users/foo%2Fbar"',
					},
				],
			},
		],
		parameters: [
			{ name: "strings", type: "TemplateStringsArray" },
			{ name: "...values", type: "string[]" },
		],
		statements:
			"return String.raw({ raw: strings }, ...values.map(encodeURIComponent));",
	});

	commandsFile.addImportDeclaration({
		namedImports: ["Except", "Jsonifiable", "UndefinedOnPartialDeep"],
		moduleSpecifier: "type-fest",
		isTypeOnly: true,
	});

	typesFile.addImportDeclaration({
		namedImports: [
			"Jsonifiable",
			"Jsonify",
			"LiteralUnion",
			"UndefinedOnPartialDeep",
		],
		moduleSpecifier: "type-fest",
		isTypeOnly: true,
	});

	const valibotModuleSpecifier = `./${valibotFile.getBaseNameWithoutExtension()}.js`;

	// Commands with a response schema get a subclass in the validated module.
	// The rest re-export the base. Both keep the same exported name so
	// consumers can swap modules and leave import sites alone
	const validatedSubclasses: { commandName: string; responseSchema: string }[] =
		[];
	const validatedReExports: string[] = [];

	const typesModuleSpecifier = `./${typesFile.getBaseNameWithoutExtension()}.js`;

	const typesImportDecl =
		commandsFile
			.getImportDeclaration(
				(decl) =>
					decl.getModuleSpecifier().getLiteralValue() === typesModuleSpecifier,
			)
			?.setIsTypeOnly(true) ||
		commandsFile.addImportDeclaration({
			moduleSpecifier: typesModuleSpecifier,
			namedImports: [],
		});

	const ensureImport = (
		type: TypeAliasDeclaration | InterfaceDeclaration | undefined,
		alias?: string,
	) => {
		if (
			type &&
			!typesImportDecl
				.getNamedImports()
				.some((namedImport) => namedImport.getName() === type.getName())
		) {
			typesImportDecl?.addNamedImport({
				name: type.getName(),
				...(alias && { alias }),
			});
			typesImportDecl.setIsTypeOnly(true);
		}
	};

	const typesAndInterfaces = new Map<
		string,
		InterfaceDeclaration | TypeAliasDeclaration
	>();

	const schemaGraph = Object.entries(schema.components?.schemas || {}).flatMap(
		([schemaName, schemaObject]) => {
			const deps = getDependents(schemaObject);
			return deps.map((dep): [string, string] => [
				`#/components/schemas/${schemaName}`,
				dep,
			]);
		},
	);

	const sorted = toposort(schemaGraph).toReversed();

	const sortedSchemas = Object.entries(
		schema.components?.schemas || {},
	).toSorted(
		([a], [b]) =>
			sorted.indexOf(`#/components/schemas/${a}`) -
			sorted.indexOf(`#/components/schemas/${b}`),
	);

	for (const [schemaName, schemaObject] of sortedSchemas) {
		registerTypesFromSchema(
			typesAndInterfaces,
			typesFile,
			schemaName,
			schemaObject,
		);

		registerValidatorFromSchema(
			validators,
			valibotFile,
			schemaName,
			schemaObject,
			options?.inputOnly,
		);

		// Add enum values to enums file
		if (
			!("$ref" in schemaObject) &&
			"enum" in schemaObject &&
			Array.isArray(schemaObject.enum)
		) {
			const values = schemaObject.enum.filter((v): v is string => v !== null);

			if (values.length > 0) {
				enumsFile.addVariableStatement({
					isExported: true,
					declarationKind: VariableDeclarationKind.Const,
					docs: schemaObject.description
						? [
								{
									description: wordWrap(schemaObject.description),
									tags: (schemaObject.deprecated
										? [{ tagName: "deprecated" }]
										: []
									).filter(Boolean),
								},
							]
						: [],
					declarations: [
						{
							name: camelCase(schemaName),
							initializer: Writers.assertion((writer) => {
								writer.write("[");
								values.forEach((value, index) => {
									writer.write(JSON.stringify(value));
									if (index < values.length - 1) {
										writer.write(", ");
									}
								});
								writer.write("]");
							}, "const"),
						},
					],
				});
			}
		}
	}

	for (const [path, pathItemObject] of Object.entries<oas31.PathItemObject>(
		schema.paths || {},
	)) {
		if (pathItemObject) {
			for (const [method, operationObject] of Object.entries(pathItemObject)
				// ensure op is an object
				.filter(
					(e): e is [string, oas31.OperationObject] => typeof e[1] === "object",
				)
				// tags
				.filter(([, o]) => !tags || o.tags?.some((t) => tags?.includes(t)))) {
				if (
					typeof operationObject === "object" &&
					"operationId" in operationObject
				) {
					const isOperationDeprecated = operationObject.deprecated === true;
					const deprecationDocs: (OptionalKind<JSDocStructure> | string)[] =
						isOperationDeprecated
							? [
									{
										kind: StructureKind.JSDoc,
										tags: [
											{
												tagName: "deprecated",
											},
										],
									},
								]
							: [];

					const pathParameters: oas30.ParameterObject[] = [];

					const commandName = pascalCase(
						operationObject.operationId.replace(/command$/i, ""),
						"Command",
					);

					const commandClassDeclaration = commandsFile.addClass({
						name: commandName,
						isExported: true,
						extends: "Command",
						docs: [...deprecationDocs],
						properties: [
							{
								name: "method",
								initializer: Writers.assertion((w) => w.quote(method), "const"),
								hasOverrideKeyword: true,
								scope: Scope.Public,
							},
						],
					});

					const jsDocStructure = {
						description: `\n${wordWrap(
							operationObject.description || commandName,
						)}\n`,

						tags: operationObject.summary
							? [
									{
										tagName: "summary",
										text: wordWrap(operationObject.summary),
									},
								]
							: [],
					};

					const jsdoc = commandClassDeclaration.addJsDoc(jsDocStructure);

					if (isOperationDeprecated) {
						jsdoc.addTag({
							tagName: "deprecated",
						});
					}

					const requestBodyObject =
						operationObject.requestBody &&
						!("$ref" in operationObject.requestBody)
							? operationObject.requestBody
							: undefined;

					const queryParameters: oas30.ParameterObject[] = [];
					const headerParameters: oas30.ParameterObject[] = [];

					for (const parameter of [
						...(operationObject.parameters || []),
						...(pathItemObject.parameters || []),
					]) {
						// TYPESAFETY: `$RefParser.resolve` types every target as
						// `unknown`, and this pointer came from a parameter list, so the
						// document declares it as a parameter
						const resolvedParameter = (
							"$ref" in parameter ? refs.get(parameter.$ref) : parameter
						) as oas30.ParameterObject;

						if (resolvedParameter.in === "path") {
							pathParameters.push(resolvedParameter);
						}

						if (
							resolvedParameter.in === "query" ||
							resolvedParameter.in === "header"
						) {
							// Resolve $ref schemas so the valibot coercion
							// pipeline can inspect the underlying type
							const resolvedSchema =
								resolvedParameter.schema && "$ref" in resolvedParameter.schema
									? (refs.get(resolvedParameter.schema.$ref) ?? undefined)
									: undefined;

							const paramWithResolvedSchema: oas30.ParameterObject = {
								...resolvedParameter,
								...(resolvedSchema &&
									typeof resolvedSchema === "object" &&
									!Array.isArray(resolvedSchema) && {
										schema: resolvedSchema,
									}),
							};

							if (resolvedParameter.in === "query") {
								queryParameters.push(paramWithResolvedSchema);
							} else {
								headerParameters.push(paramWithResolvedSchema);
							}
						}

						// OpenAPI 3.2's `in: "querystring"` hands over the whole query
						// string as one content-typed value, which this generator lacks a
						// way to express. A warning is all that is left, since a valid
						// document would otherwise generate an operation with its query
						// silently dropped
						if (isQuerystringLocation(resolvedParameter.in)) {
							console.warn(
								`${operationObject.operationId}: parameter "${resolvedParameter.name}" uses \`in: querystring\`, which this generator does not support — the operation is generated with no query at all. Declare the members as \`in: query\` parameters instead.`,
							);
						}
					}

					// Extract path parameters from URL pattern that weren't declared this
					// is technically against the spec but we are the good guys
					for (const [, paramName] of path.matchAll(/\{(\w+)\}/g)) {
						const alreadyDeclared = pathParameters.some(
							(p) => p.name === paramName,
						);

						if (!alreadyDeclared && paramName) {
							pathParameters.push({
								name: paramName,
								in: "path",
								required: true,
								schema: { type: "string" },
							});
						}
					}

					// Entries here mark where the document departs from OpenAPI's
					// default. An absent entry means that default, and never a
					// generator's guess
					const styledQueryParameters = queryParameters.filter((parameter) => {
						const { style, explode } = queryParameterEncoding(parameter);
						return style !== "form" || !explode;
					});

					if (styledQueryParameters.length > 0) {
						commandClassDeclaration.addProperty({
							name: "queryStyles",
							hasOverrideKeyword: true,
							scope: Scope.Public,
							initializer: JSON.stringify(
								Object.fromEntries(
									styledQueryParameters.map((parameter) => {
										const { style, explode } =
											queryParameterEncoding(parameter);
										return [parameter.name, { style, explode }];
									}),
								),
							),
						});
					}

					const queryType =
						queryParameters.length > 0
							? typesFile.addTypeAlias({
									name: pascalCase(
										commandClassDeclaration.getName() || "INVALID",
										"Query",
									),
									docs: deprecationDocs,
									isExported: true,
									type: Writers.objectType({
										properties: queryParameters.map((qp) => {
											const name = castToValidJsIdentifier(qp.name);

											if (!qp.schema) {
												return {
													name,
													hasQuestionToken: !qp.required,
												};
											}

											const type = schemaToType(
												typesAndInterfaces,
												qp.required
													? {
															required: [name],
														}
													: {},
												name,
												qp.schema,
												{
													// query parameters can't be strictly "boolean"
													booleanAsStringish: true,
													integerAsStringish: true,
												},
											);

											const resolvedType = type.type;

											return {
												...type,
												name,
												hasQuestionToken: !qp.required,
												...(resolvedType !== undefined && {
													type: resolvedType,
												}),
											};
										}),
									}),
								})
							: undefined;

					ensureImport(queryType);

					const headerType =
						headerParameters.length > 0
							? typesFile.addTypeAlias({
									name: pascalCase(
										commandClassDeclaration.getName() || "INVALID",
										"Header",
									),
									docs: deprecationDocs,
									isExported: true,
									type: Writers.objectType({
										properties: headerParameters.map((hp) => {
											const name = hp.name.toLowerCase();

											if (!hp.schema) {
												return {
													name: JSON.stringify(name),
													hasQuestionToken: !hp.required,
												};
											}

											const type = schemaToType(
												typesAndInterfaces,
												hp.required
													? {
															required: [name],
														}
													: {},
												name,
												hp.schema,
												{
													booleanAsStringish: true,
													integerAsStringish: true,
												},
											);

											const resolvedType = type.type;

											return {
												...type,
												name: JSON.stringify(name),
												hasQuestionToken: !hp.required,
												...(resolvedType !== undefined && {
													type: resolvedType,
												}),
											};
										}),
									}),
								})
							: undefined;

					ensureImport(headerType);

					const jsonRequestBodyObject =
						requestBodyObject?.content["application/json"];

					const jsonBodyType = iife(() => {
						if (!jsonRequestBodyObject?.schema) {
							return;
						}

						if ("$ref" in jsonRequestBodyObject.schema) {
							return typesAndInterfaces.get(jsonRequestBodyObject.schema.$ref);
						}

						if (
							jsonRequestBodyObject.schema.type === "array" &&
							"items" in jsonRequestBodyObject.schema &&
							"$ref" in jsonRequestBodyObject.schema.items
						) {
							return typesAndInterfaces.get(
								jsonRequestBodyObject.schema.items.$ref,
							);
						}

						// Named for the media type because only an application/json
						// request body is generated
						const name = castToValidJsIdentifier(
							pascalCase(operationObject.operationId || "", "JsonBody"),
						);

						const type = schemaToType(
							typesAndInterfaces,
							jsonRequestBodyObject.schema.required
								? {
										required: [name],
									}
								: {},
							name,
							jsonRequestBodyObject.schema,
						);

						return typesFile.addTypeAlias({
							name,
							docs: deprecationDocs,
							type:
								typeof type.type === "function" ? type.type : String(type.type),
						});
					});

					const nonJsonBodyEntries = requestBodyObject?.content
						? Object.entries(requestBodyObject.content).filter(
								([, o]) => o !== jsonRequestBodyObject,
							)
						: [];

					if (jsonBodyType && nonJsonBodyEntries.length > 0) {
						console.warn(
							commandClassDeclaration.getName(),
							"Non-json and json body types are not supported together yet",
						);
					}

					const nonJsonBodyPropName = "body";
					const inputBodyName = "body";

					const nonJsonBodyType =
						!jsonBodyType && nonJsonBodyEntries.length > 0
							? typesFile.addTypeAlias({
									docs: deprecationDocs,
									name: pascalCase(
										`${commandClassDeclaration.getName() || "INVALID"} Body NonJson`,
									),
									isExported: true,
									type: Writers.objectType({
										properties: [
											{
												name: nonJsonBodyPropName,
												type: createUnion(
													...nonJsonBodyEntries.map(
														([contentType, _mediaTypeObj]) => {
															const nonJsonBody = typesFile.addTypeAlias({
																name: pascalCase(
																	`${commandClassDeclaration.getName() || "INVALID"} Body ${contentType}`,
																),
																type: "NonNullable<RequestInit['body']>",
															});

															return nonJsonBody.getName();
														},
													),
												),
											},
										],
									}),
								})
							: undefined;

					const paramsType =
						pathParameters.length > 0
							? typesFile.addTypeAlias({
									name: pascalCase(
										`${commandClassDeclaration.getName() || "INVALID"}Params`,
									),
									docs: deprecationDocs,
									type: Writers.objectType({
										properties: pathParameters.map((p) => {
											const name = castToValidJsIdentifier(p.name);

											const type = schemaToType(
												typesAndInterfaces,
												p.required
													? {
															required: [name],
														}
													: {},
												name,
												p.schema || {
													type: "string",
													description:
														"// TODO: check this? no path param schema was found",
												},
												{
													// parameters can't be strictly "boolean"
													booleanAsStringish: true,
													integerAsStringish: true,
												},
											);

											return {
												...type,
												name,
												type: type.type || unspecifiedKeyword,
											};
										}),
									}),
									isExported: true,
								})
							: null;

					const bodyType =
						(jsonBodyType &&
							typesFile.addTypeAlias({
								name: pascalCase(
									commandClassDeclaration.getName() || "",
									"Body",
								),
								type: jsonBodyType.getName(),
								isExported: true,
							})) ||
						nonJsonBodyType;

					if (bodyType) {
						ensureImport(bodyType);
					}

					// An array body intersected with the parameters reads as the array
					// alone, and the parameters vanish. It goes under `body`, the same
					// way a non-JSON body already does
					const jsonBodySchema = jsonRequestBodyObject?.schema;
					const jsonBodyIsArray =
						!!jsonBodySchema &&
						!("$ref" in jsonBodySchema) &&
						jsonBodySchema.type === "array";
					const wrapJsonBody = jsonBodyIsArray && (!!paramsType || !!queryType);

					const wrappedJsonBodyType =
						wrapJsonBody && jsonBodyType
							? typesFile.addTypeAlias({
									name: pascalCase(
										commandClassDeclaration.getName() || "",
										"BodyWrapper",
									),
									type: Writers.objectType({
										properties: [
											{ name: inputBodyName, type: jsonBodyType.getName() },
										],
									}),
								})
							: undefined;

					const inputType = typesFile.addTypeAlias({
						name: pascalCase(commandClassDeclaration.getName() || "", "Input"),
						type: createIntersection(
							wrappedJsonBodyType?.getName() ||
								jsonBodyType?.getName() ||
								nonJsonBodyType?.getName(),
							paramsType?.getName(),
							queryType?.getName(),
						),
						isExported: true,
					});
					ensureImport(inputType);

					// Resolve the first 2xx JSON response schema (inline or $ref) so the
					// validator pipeline treats responses the same as request bodies
					const firstJsonResponseSchema = iife(() => {
						const firstSuccess = Object.entries(
							operationObject.responses ?? {},
						).find(([s]) => s.startsWith("2"));

						if (!firstSuccess) {
							return;
						}

						const [statusCode, response] = firstSuccess;

						if (statusCode === "204" || "$ref" in response) {
							return;
						}

						return response.content?.["application/json"]?.schema;
					});

					// Generate the valibot validator for the operation input
					const operationSchemas = createValidatorForOperationInput(
						validators,
						valibotFile,
						commandName,
						{
							...(jsonRequestBodyObject?.schema && {
								body: jsonRequestBodyObject?.schema,
							}),
							...(firstJsonResponseSchema && {
								response: firstJsonResponseSchema,
							}),
							params: pathParameters,
							query: queryParameters,
							header: headerParameters,
						},
						options?.inputOnly,
					);

					// Track operation for middleware generation (use coerced schemas)
					const middlewareExportName = castToValidJsIdentifier(
						operationObject.operationId.replace(/Command$/i, ""),
					);
					warnOnUnderspecifiedQuery(
						operationObject.operationId,
						queryParameters,
					);

					allOperations.push({
						exportName: middlewareExportName,
						schemas: options?.inputOnly
							? operationSchemas.input
							: operationSchemas.wire,
						queryParams: queryParameters
							.map((parameter) => queryParameterSpec(parameter))
							.filter((spec) => spec !== undefined),
					});

					// Widen optional fields with `| undefined` at the serialization
					// boundary. Outbound payloads are JSON.stringified, which drops
					// `undefined`, so callers can pass `{ field: undefined }` even
					// under exactOptionalPropertyTypes. A non-JSON `body` field holds
					// a BodyInit class instance, which UndefinedOnPartialDeep would
					// mangle, so widen everything else and re-intersect `body`
					const inputTypeArg = (() => {
						if (!inputType) {
							return unspecifiedKeyword;
						}

						const inputTypeName = inputType.getName();

						return nonJsonBodyType
							? `UndefinedOnPartialDeep<Except<${inputTypeName}, "body">> & Pick<${inputTypeName}, "body">`
							: `UndefinedOnPartialDeep<${inputTypeName}>`;
					})();

					if (inputType) {
						inputTypeArgs.add(inputTypeArg);
						inputTypeNames.add(inputType.getName());
					}

					commandClassDeclaration.getExtends()?.addTypeArgument(inputTypeArg);

					// this is just like a 204 response
					let hasOutputType = false;

					if (
						!operationObject.responses ||
						Object.keys(operationObject.responses).length === 0
					) {
						commandClassDeclaration
							.getExtends()
							?.addTypeArgument(unspecifiedKeyword);
						hasOutputType = true;
					}

					for (const [statusCode, response] of Object.entries({
						...operationObject.responses,
					}).filter(([s]) => s.startsWith("2"))) {
						// Output is one type argument, so the first usable 2xx response
						// settles it. An operation documenting both a 200 and a 204 would
						// otherwise add a second argument, which lands in the query slot
						// and is not a query type
						if (hasOutputType) {
							break;
						}

						// early out if response is 204
						if (statusCode === "204") {
							commandClassDeclaration
								.getExtends()
								?.addTypeArgument(emptyKeyword);

							outputTypes.add(emptyKeyword);
							hasOutputType = true;
							break;
						}

						// we dont support refs as response objects
						if ("$ref" in response) {
							break;
						}

						const jsonResponse = response.content?.["application/json"];

						if (!jsonResponse) {
							break;
						}

						const arrayRef =
							jsonResponse.schema &&
							"items" in jsonResponse.schema &&
							"$ref" in jsonResponse.schema.items &&
							jsonResponse.schema.items.$ref;

						const regularRef =
							jsonResponse.schema &&
							"$ref" in jsonResponse.schema &&
							jsonResponse.schema.$ref;

						const outputRef = arrayRef || regularRef;

						if (outputRef) {
							const outputType = typesAndInterfaces.get(outputRef);

							if (outputType) {
								outputTypes.add(outputType);
								ensureImport(outputType);
							}

							const outputTypeName = `${outputType?.getName()}${
								arrayRef ? "[]" : ""
							}`;

							if (arrayRef) {
								outputTypes.add(outputTypeName);
							}

							commandClassDeclaration
								.getExtends()
								?.addTypeArgument(outputTypeName);
							hasOutputType = true;

							// Handler-return alias for `c.json(...)` on the server side.
							// The value is JSON.stringified, which drops `undefined`, so
							// optional fields may hold `undefined`. Mirrors the `input*`
							// prefix used for the lax variant in the valibot module
							typesFile.addTypeAlias({
								name: pascalCase(
									"Input",
									commandClassDeclaration.getName() || "INVALID",
									"Response",
								),
								type: `UndefinedOnPartialDeep<${outputTypeName}>`,
								isExported: true,
							});
						} else if (jsonResponse.schema) {
							const outputType = schemaToType(
								typesAndInterfaces,
								{},
								"",
								jsonResponse.schema,
							);

							const responseTypeAlias = typesFile.addTypeAlias({
								name: pascalCase(
									commandClassDeclaration.getName() || "INVALID",
									"Output",
								),
								type:
									typeof outputType.type === "function"
										? outputType.type
										: Writers.unionType(`${outputType.type}`, "undefined"),
								isExported: true,
							});

							ensureImport(responseTypeAlias);

							commandClassDeclaration
								.getExtends()
								?.addTypeArgument(responseTypeAlias.getName());
							outputTypes.add(responseTypeAlias);
							hasOutputType = true;

							typesFile.addTypeAlias({
								name: pascalCase(
									"Input",
									commandClassDeclaration.getName() || "INVALID",
									"Response",
								),
								type: `UndefinedOnPartialDeep<${responseTypeAlias.getName()}>`,
								isExported: true,
							});
						}
					}

					if (!hasOutputType) {
						commandClassDeclaration
							.getExtends()
							?.addTypeArgument(unspecifiedKeyword);
					}

					// Static schema attachment is deferred to the validated module, so
					// the base command module imports zero schemas. rest-client reads
					// the response schema from the validated subclass, and the server
					// middleware imports body, param and query schemas directly. The
					// wire variant is what rest-client and hono consume, falling back
					// to the input variant under --input-only
					const wireSchemas = options?.inputOnly
						? operationSchemas.input
						: operationSchemas.wire;

					if (wireSchemas.response) {
						validatedSubclasses.push({
							commandName,
							responseSchema: wireSchemas.response,
						});
					} else {
						validatedReExports.push(commandName);
					}

					// query
					if (queryType) {
						commandClassDeclaration
							.getExtends()
							?.addTypeArgument(queryType.getName());
					}

					// headers type argument (4th generic on Command)
					if (headerType) {
						// fill in query slot if missing
						if (!queryType) {
							commandClassDeclaration
								.getExtends()
								?.addTypeArgument(neverKeyword);
						}

						commandClassDeclaration
							.getExtends()
							?.addTypeArgument(headerType.getName());
					}

					const hasPathParams = path.includes("{");
					const pathname = hasPathParams
						? `encodePath\`${path.replaceAll("{", "${")}\``
						: `"${path}"`;

					const hasJsonBody = !!jsonBodyType;

					const hasNonJsonBody = !!nonJsonBodyType;

					const hasQuery =
						queryType &&
						!isUnspecifiedKeyword(queryType) &&
						queryParameters.length > 0;

					const hasParams =
						paramsType &&
						!isUnspecifiedKeyword(paramsType) &&
						pathParameters.length > 0;

					const hasHeaders = !!headerType && headerParameters.length > 0;

					const allInputOptional =
						!hasParams &&
						!hasJsonBody &&
						!hasNonJsonBody &&
						queryParameters.every((qp) => !qp.required);

					const allHeadersOptional = headerParameters.every(
						(hp) => !hp.required,
					);

					if (
						hasNonJsonBody ||
						hasJsonBody ||
						hasQuery ||
						hasParams ||
						hasHeaders
					) {
						const ctor = commandClassDeclaration.addConstructor();

						const queryParameterNames = queryParameters
							.map((q) => q.name)
							.map(castToValidJsIdentifier);

						const pathParameterNames = pathParameters
							.map((q) => q.name)
							.map(castToValidJsIdentifier);

						const paramsToDestructure = [
							...pathParameterNames,
							...queryParameterNames,
						];

						if (!isUnspecifiedKeyword(inputType)) {
							const cctorParam = ctor.addParameter({
								name: "input",
								type: hasNonJsonBody
									? `UndefinedOnPartialDeep<Except<${inputType.getName()}, "body">> & Pick<${inputType.getName()}, "body">`
									: `UndefinedOnPartialDeep<${inputType.getName()}>`,
								...(allInputOptional && { hasQuestionToken: true }),
							});

							if (hasHeaders) {
								ctor.addParameter({
									name: "headers",
									type: headerType.getName(),
									...(allHeadersOptional && { hasQuestionToken: true }),
								});
							}

							ctor.addStatements([
								{
									kind: StructureKind.VariableStatement,
									declarationKind: VariableDeclarationKind.Const,
									declarations: [
										{
											kind: StructureKind.VariableDeclaration,
											initializer: allInputOptional
												? `${cctorParam.getName()} ?? {}`
												: cctorParam.getName(),
											name: iife(() => {
												switch (true) {
													case paramsToDestructure.length > 0 && hasNonJsonBody:
														return `{${[
															...paramsToDestructure,
															nonJsonBodyPropName,
														].join(", ")} }`;
													case paramsToDestructure.length > 0 && hasJsonBody:
														return `{${[
															...paramsToDestructure,
															wrapJsonBody
																? inputBodyName
																: `...${inputBodyName}`,
														].join(", ")} }`;
													case paramsToDestructure.length > 0 && !hasJsonBody:
														return `{${paramsToDestructure.join(", ")} }`;
													case hasNonJsonBody:
														return `{${nonJsonBodyPropName}}`;
													case hasJsonBody:
														return inputBodyName;
													default:
														return "_";
												}
											}),
										},
									],
								},
								"super();",
							]);
						}

						const superKeyword = ctor.getFirstDescendantByKind(
							SyntaxKind.SuperKeyword,
						);

						const callExpr = superKeyword?.getParentIfKindOrThrow(
							SyntaxKind.CallExpression,
						);

						const headersArg = hasHeaders ? "headers" : undefined;

						const queryOrHeaderArgs = iife(() => {
							if (hasQuery) {
								return [`stripUndefined({${queryParameterNames.join(", ")}})`];
							}
							if (hasHeaders) {
								return [emptyKeyword];
							}
							return [];
						});

						// type narrowing
						if (Node.isCallExpression(callExpr)) {
							if (hasJsonBody) {
								callExpr.addArguments([
									pathname,
									`jsonStringify(${inputBodyName})`,
									...queryOrHeaderArgs,
									...(headersArg ? [headersArg] : []),
								]);
							} else if (hasNonJsonBody) {
								callExpr.addArguments([
									pathname,
									nonJsonBodyPropName,
									...queryOrHeaderArgs,
									...(headersArg ? [headersArg] : []),
								]);
							} else if (hasQuery) {
								callExpr.addArguments([
									pathname,
									emptyKeyword,
									`stripUndefined({${queryParameterNames.join(", ")}})`,
									...(headersArg ? [headersArg] : []),
								]);
							} else if (hasHeaders && headersArg) {
								callExpr.addArguments([
									pathname,
									emptyKeyword,
									emptyKeyword,
									headersArg,
								]);
							} else {
								callExpr.addArguments([pathname]);
							}
						}
					} else {
						const ctor = commandClassDeclaration.addConstructor();
						ctor.addStatements([`super(${pathname});`]);
					}
				}
			}
		}
	}

	const serviceClientClassName = "RestServiceClient";
	const fetcherName = "createIsomorphicNativeFetcher";
	const configType = "RestServiceClientConfig";

	mainFile.addImportDeclaration({
		moduleSpecifier: "@block65/rest-client",
		namedImports: [
			serviceClientClassName,
			fetcherName,
			{
				name: configType,
				isTypeOnly: true,
			},
		],
	});

	// Re-export the runtime error consumers need for `instanceof` narrowing,
	// sparing them a direct @block65/rest-client dependency for it alone
	mainFile.addExportDeclaration({
		moduleSpecifier: "@block65/rest-client",
		namedExports: ["ResponseValidationError"],
	});

	// Commands from another generated client fail the `<AllInputs, AllOutputs>`
	// constraint on `.json()`, which guards against mixing clients
	const outputUnionMembers = [...outputTypes]
		.map((t) => (typeof t === "string" ? t : t.getName()))
		.filter((name): name is string => !!name && name !== unspecifiedKeyword);

	const allInputs =
		inputTypeArgs.size > 0
			? mainFile.addTypeAlias({
					name: "AllInputs",
					type: createUnion(...inputTypeArgs),
				})
			: undefined;

	const allOutputs =
		outputUnionMembers.length > 0
			? mainFile.addTypeAlias({
					name: "AllOutputs",
					type: createUnion(...outputUnionMembers),
				})
			: undefined;

	const outputTypeNames = new Set<string>(
		[...outputTypes]
			.map((t) => (typeof t === "string" ? t : t.getName()))
			.filter((n): n is string => !!n && n !== emptyKeyword)
			.map((n) => n.replace(/\[\]$/, "")),
	);

	const importNames = new Set([...inputTypeNames, ...outputTypeNames]);

	if (importNames.size > 0) {
		mainFile.addImportDeclaration({
			moduleSpecifier: typesModuleSpecifier,
			namedImports: [...importNames].toSorted(),
			isTypeOnly: true,
		});
	}

	if (inputTypeArgs.size > 0) {
		mainFile.addImportDeclaration({
			moduleSpecifier: "type-fest",
			namedImports: ["Except", "UndefinedOnPartialDeep"],
			isTypeOnly: true,
		});
	}

	const clientClassDeclaration = mainFile.addClass({
		name: pascalCase(schema.info.title, "RestClient"),
		isExported: true,
		extends: `${serviceClientClassName}<${allInputs?.getName() || unspecifiedKeyword}, ${allOutputs?.getName() || unspecifiedKeyword}>`,
	});

	const ctor = clientClassDeclaration.addConstructor();

	const baseUrl = ctor.addParameter({
		name: "baseUrl",
		type: Writers.unionType("string", "URL"),
		initializer: `new URL('${
			new URL(`${schema.servers?.[0]?.url || "https://api.example.com"}/`).href
		}')`,
	});

	const configParam = ctor.addParameter({
		name: "config",
		type: configType,
		hasQuestionToken: true,
	});

	ctor.addStatements(["super();"]);

	const superKeyword = ctor.getFirstDescendantByKind(SyntaxKind.SuperKeyword);
	const callExpr = superKeyword?.getParentIfKindOrThrow(
		SyntaxKind.CallExpression,
	);

	// type narrowing
	if (Node.isCallExpression(callExpr)) {
		callExpr?.addArguments([baseUrl.getName(), configParam.getName()]);
	}

	// Build the validated module. Subclasses attach `static responseSchema`,
	// and commands lacking one are re-exported unchanged so the module keeps
	// export parity with the base and stays alias-safe
	const commandsModuleSpecifier = `./${commandsFile.getBaseNameWithoutExtension()}.js`;

	if (validatedSubclasses.length > 0) {
		// Namespace imports keep the generated file compact and stable across
		// regenerations. Adding or removing a single command leaves the import
		// list alone. Modern bundlers tree-shake namespace imports correctly
		// when the source modules are pure, which holds for both
		const commandsNs = "commands";
		const schemasNs = "schemas";

		commandsValidatedFile.addImportDeclaration({
			moduleSpecifier: commandsModuleSpecifier,
			namespaceImport: commandsNs,
		});

		commandsValidatedFile.addImportDeclaration({
			moduleSpecifier: valibotModuleSpecifier,
			namespaceImport: schemasNs,
		});

		for (const { commandName, responseSchema } of validatedSubclasses) {
			commandsValidatedFile.addClass({
				name: commandName,
				isExported: true,
				extends: `${commandsNs}.${commandName}`,
				properties: [
					{
						name: "responseSchema",
						isStatic: true,
						initializer: `${schemasNs}.${responseSchema}`,
					},
				],
			});
		}
	}

	if (validatedReExports.length > 0) {
		commandsValidatedFile.addExportDeclaration({
			moduleSpecifier: commandsModuleSpecifier,
			namedExports: validatedReExports.toSorted().map((name) => ({ name })),
		});
	}

	mainFile.organizeImports();

	// tidies up any unused type-fest imports
	typesFile.fixUnusedIdentifiers();
	commandsFile.fixUnusedIdentifiers();
	commandsValidatedFile.fixUnusedIdentifiers();
	valibotFile.fixUnusedIdentifiers();

	// Generate hono file
	const honoFile = createHonoFile(project, outputDir);

	// Collect all schema names needed
	const schemaImports = new Set<string>();

	for (const op of allOperations) {
		for (const schemaName of Object.values(op.schemas)) {
			if (schemaName) {
				schemaImports.add(schemaName);
			}
		}
	}

	// Add the schema imports
	addSchemaImportsToHonoFile(honoFile, [...schemaImports]);

	// Generate middleware exports for each operation
	for (const op of allOperations) {
		createHonoMiddleware(honoFile, op.exportName, op.schemas, op.queryParams);
	}

	honoFile.fixUnusedIdentifiers();

	// `Command` defaults its output to `unknown`, so an explicit `unknown`
	// repeats the default. A trailing argument can go, while an earlier one
	// holds the position of the arguments after it
	for (const commandClass of commandsFile.getClasses()) {
		const base = commandClass.getExtends();
		const typeArguments = base?.getTypeArguments() ?? [];
		const last = typeArguments.at(-1);

		if (base && typeArguments.length > 1 && last?.getText() === "unknown") {
			base.removeTypeArgument(last);
		}
	}

	return {
		commandsFile,
		commandsValidatedFile,
		typesFile,
		mainFile,
		valibotFile,
		honoFile,
		enumsFile,
	};
}
