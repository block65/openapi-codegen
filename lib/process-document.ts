/* eslint-disable no-restricted-syntax */

import { join, relative } from "node:path";
import { $RefParser } from "@apidevtools/json-schema-ref-parser";
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
	addValibotImportsToHonoValibotFile,
	createHonoValibotFile,
	createHonoValibotMiddleware,
} from "./hono-valibot.ts";
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

interface OperationMiddlewareInfo {
	exportName: string;
	schemas: { json?: string; param?: string; query?: string; header?: string };
}

const neverKeyword = "never" as const;
// function isNeverKeyword(type: TypeAliasDeclaration) {
//   return type?.getTypeNode()?.getKindName() === neverKeyword;
// }

const unspecifiedKeyword = "unknown" as const;
function isUnspecifiedKeyword(type: TypeAliasDeclaration) {
	return type?.getTypeNode()?.getKindName() === unspecifiedKeyword;
}

const emptyKeyword = "undefined" as const;
// function isEmptyKeyword(type: TypeAliasDeclaration) {
//   return type?.getTypeNode()?.getKindName() === emptyKeyword;
// }

// the union/intersect helpers keep typescript happy due to ts-morph typings
function createIntersection(...types: (string | undefined)[]) {
	// create a type  of all the inputs
	const [type1, type2, ...typeX] = types.filter((t): t is string => !!t);
	return (
		(type1 && type2
			? Writers.intersectionType(type1, type2, ...typeX)
			: type1) || neverKeyword
	);
}

// the union/intersect helpers keep typescript happy due to ts-morph typings
function createUnion(...types: (string | undefined)[]) {
	// create a type  of all the inputs
	const [type1, type2, ...typeX] = types
		.filter((t): t is string => !!t)
		.sort((a, b) => a.localeCompare(b));
	return (
		(type1 && type2 ? Writers.unionType(type1, type2, ...typeX) : type1) ||
		neverKeyword
	);
}

export async function processOpenApiDocument(
	outputDir: string,
	schema: Simplify<oas31.OpenAPIObject>,
	tags?: string[] | undefined,
) {
	const project = new Project();

	const commandsFile = project.createSourceFile(
		join(outputDir, "commands.ts"),
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
	const enumsFile = project.createSourceFile(
		join(outputDir, "enums.ts"),
		"",
		{ overwrite: true },
	);

	// Validators file for Valibot schemas
	const valibotFile = createValibotFile(project, outputDir);

	// Track registered validators by their $ref path
	const validators = new Map<string, string>();

	// Track all operations for middleware generation
	const allOperations: OperationMiddlewareInfo[] = [];

	const outputTypes = new Set<
		| InterfaceDeclaration
		| TypeAliasDeclaration
		| typeof unspecifiedKeyword
		| string
	>();

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
		returnType: "string",
		statements:
			"return String.raw({ raw: strings }, ...values.map(encodeURIComponent));",
	});

	commandsFile.addImportDeclaration({
		namedImports: ["Jsonifiable"],
		moduleSpecifier: "type-fest",
		isTypeOnly: true,
	});

	typesFile.addImportDeclaration({
		namedImports: ["Jsonifiable", "Jsonify"],
		moduleSpecifier: "type-fest",
		isTypeOnly: true,
	});

	const typesModuleSpecifier =
		`./${typesFile.getBaseNameWithoutExtension()}.js` ||
		relative(commandsFile.getDirectoryPath(), typesFile.getFilePath());

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

	const sorted = toposort(schemaGraph).reverse();

	const sortedSchemas = Object.entries(schema.components?.schemas || {}).sort(
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
		);

		// Add enum values to enums file
		if (
			!("$ref" in schemaObject) &&
			"enum" in schemaObject &&
			Array.isArray(schemaObject.enum)
		) {
			const values = schemaObject.enum.filter(
				(v): v is string => v !== null,
			);

			if (values.length > 0) {
				enumsFile.addVariableStatement({
					isExported: true,
					declarationKind: VariableDeclarationKind.Const,
					docs: schemaObject.description
						? [
								{
									description: wordWrap(schemaObject.description),
									tags: [
										...(schemaObject.deprecated
											? [{ tagName: "deprecated" }]
											: []),
									].filter(Boolean),
								},
							]
						: [],
					declarations: [
						{
							name: camelCase(schemaName),
							initializer: Writers.assertion(
								(writer) => {
									writer.write("[");
									values.forEach((value, index) => {
										writer.write(JSON.stringify(value));
										if (index < values.length - 1) writer.write(", ");
									});
									writer.write("]");
								},
								"const",
							),
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

						tags: [
							...(operationObject.summary
								? [
										{
											tagName: "summary",
											text: wordWrap(operationObject.summary),
										},
									]
								: []),
						],
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
						const resolvedParameter =
							("$ref" in parameter
								? refs.get(parameter.$ref)
								: parameter) as oas30.ParameterObject;

						if (resolvedParameter.in === "path") {
							pathParameters.push(resolvedParameter);

							// jsdoc.addTag({
							//   tagName: 'param',
							//   text: wordWrap(
							//     `${parameterName} {String} ${
							//       resolvedParameter.description || ''
							//     }`,
							//   ).trim(),
							// });
						}

						if (
							resolvedParameter.in === "query" ||
							resolvedParameter.in === "header"
						) {
							// Resolve $ref schemas so the valibot coercion
							// pipeline can inspect the underlying type
							const resolvedSchema =
								resolvedParameter.schema &&
								"$ref" in resolvedParameter.schema
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

											const resolvedType = qp.required
												? type.type
												: typeof type.type === "function"
													? type.type
													: type.type
														? Writers.unionType(`${type.type}`, "undefined")
														: undefined;

											return {
												...type,
												name,
												hasQuestionToken: !qp.required,
												...(resolvedType !== undefined && { type: resolvedType }),
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
													// headers are strings on the wire but
													// valibot parses them to native types
													booleanAsStringish: false,
													integerAsStringish: false,
												},
											);

											const resolvedType = hp.required
												? type.type
												: typeof type.type === "function"
													? type.type
													: type.type
														? Writers.unionType(`${type.type}`, "undefined")
														: undefined;

											return {
												...type,
												name: JSON.stringify(name),
												hasQuestionToken: !hp.required,
												...(resolvedType !== undefined && { type: resolvedType }),
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
							return undefined;
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

						// named as such because we only support the json request body atm
						const name = castToValidJsIdentifier(
							`${operationObject.operationId} JsonBody`,
						);

						// if (!requestBodySchema) {
						//   return {
						//     name,
						//     hasQuestionToken: !requestBodyObjectJson.schema.required,
						//   };
						// }

						const type = schemaToType(
							typesAndInterfaces,
							jsonRequestBodyObject.schema.required
								? {
										required: [name],
									}
								: {},
							name,
							jsonRequestBodyObject.schema,
							{
								// query parameters can't be strictly "boolean"
								booleanAsStringish: true,
								integerAsStringish: true,
							},
						);

						return typesFile.addTypeAlias({
							name,
							docs: deprecationDocs,
							type:
								// I dont know how to do nested writer functions
								typeof type.type === "function" ? type.type : String(type.type),
						});

						// console.warn("Couldn't find a body type for", requestBodyObjectJson.schema);

						// return undefined;
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

															// nonJsonBody.addJsDoc({
															//   description: `The body of the request, encoded as ${contentType}`,
															//   tags: [
															//     {
															//       tagName: 'param',
															//       text: wordWrap(
															//         `body {${nonJsonBody.getName()}} ${mediaTypeObj.schema?.description || ''
															//         }`,
															//       ).trim(),
															//     },
															//   ],
															// });

															return nonJsonBody.getName();
														},
													),
												),
											},
										],
									}),
								})
							: undefined;

					// ensureImport(bodyType);

					// const paramsParamName = 'parameters';
					// if (bodyType) {
					//   jsdoc.addTag({
					//     tagName: 'param',
					//     text: wordWrap(
					//       `${paramsParamName}.body {${bodyType.getName()}} ${maybeJsDocDescription()}`,
					//     ).trim(),
					//   });
					// }

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

					const inputType = typesFile.addTypeAlias({
						name: pascalCase(commandClassDeclaration.getName() || "", "Input"),
						type: createIntersection(
							jsonBodyType?.getName() || nonJsonBodyType?.getName(),
							paramsType?.getName(),
							queryType?.getName(),
						),
						isExported: true,
					});
					ensureImport(inputType);

					// Hook: Generate Valibot validator for operation input
					const operationSchemas = createValidatorForOperationInput(
						validators,
						valibotFile,
						commandName,
						{
							...(jsonRequestBodyObject?.schema && {
								body: jsonRequestBodyObject?.schema,
							}),
							params: pathParameters,
							query: queryParameters,
							header: headerParameters,
						},
					);

					// Track operation for middleware generation
					const middlewareExportName = castToValidJsIdentifier(
						operationObject.operationId.replace(/Command$/i, ""),
					);
					allOperations.push({
						exportName: middlewareExportName,
						schemas: operationSchemas,
					});

					// CommandInput
					commandClassDeclaration
						.getExtends()
						?.addTypeArgument(inputType?.getName() || unspecifiedKeyword);

					// if (queryType && !isVoidKeyword(queryType)) {
					//   ctor.addParameter({
					//     name: 'query',
					//     type: queryType.getName(),
					//   });
					// }

					// for (const queryParam of queryParameters) {
					//   const queryParameterName = camelcase(queryParam.name);

					//   jsdoc.addTag({
					//     tagName: 'param',
					//     text: wordWrap(
					//       `${paramsParamName}.query.${queryParameterName}${
					//         queryParam.required ? '' : '?'
					//       } {String} ${maybeJsDocDescription(
					//         queryParam.deprecated && 'DEPRECATED',
					//         queryParam.description,
					//         String(queryParam.example || ''),
					//       )}`,
					//     ).trim(),
					//   });
					// }

					// this is just like a 204 response.
					if (
						!operationObject.responses ||
						Object.keys(operationObject.responses).length === 0
					) {
						commandClassDeclaration
							.getExtends()
							?.addTypeArgument(unspecifiedKeyword);
					}

					for (const [statusCode, response] of Object.entries({
						...operationObject.responses,
					}).filter(([s]) => s.startsWith("2"))) {
						// early out if response is 204
						if (statusCode === "204") {
							commandClassDeclaration
								.getExtends()
								?.addTypeArgument(emptyKeyword);

							outputTypes.add(emptyKeyword);
							break;
						}

						// we dont support refs as response objects
						if ("$ref" in response) {
							break;
						}

						const jsonResponse = response.content?.["application/json"];

						const arrayRef =
							jsonResponse?.schema &&
							"items" in jsonResponse.schema &&
							"$ref" in jsonResponse.schema.items &&
							jsonResponse.schema.items.$ref;

						const regularRef =
							jsonResponse?.schema &&
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
								?.addTypeArgument(`${outputTypeName}`);

							// jsdoc.addTag({
							//   tagName: 'returns',
							//   text: `{${retVal}} HTTP ${statusCode}`,
							// });
						} else if (jsonResponse?.schema) {
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
									// I dont know how to do nested writer functions
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

							// jsdoc.addTag({
							//   tagName: 'returns',
							//   text: `{${retVal}} HTTP ${statusCode}`,
							// });
						} else {
							const retVal = unspecifiedKeyword;

							commandClassDeclaration.getExtends()?.addTypeArgument(retVal);
							outputTypes.add(retVal);
						}
					}

					// body
					// commandClassDeclaration
					//   .getExtends()
					//   ?.addTypeArgument(
					//     bodyType ? bodyType.getName() :

					//       neverKeyword,
					//   );

					// query
					if (queryType) {
						commandClassDeclaration
							.getExtends()
							?.addTypeArgument(queryType.getName());
					}

					const hasPathParams = path.includes("{");
					const pathname = hasPathParams
						? `encodePath\`${path.replaceAll(/{/g, "${")}\``
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

					if (hasNonJsonBody || hasJsonBody || hasQuery || hasParams) {
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
								type: inputType.getName(),
							});

							ctor.addStatements([
								{
									kind: StructureKind.VariableStatement,
									declarationKind: VariableDeclarationKind.Const,
									declarations: [
										{
											kind: StructureKind.VariableDeclaration,
											initializer: cctorParam.getName(),
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
															`...${inputBodyName}`,
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

						// type narrowing
						if (Node.isCallExpression(callExpr)) {
							if (hasJsonBody) {
								callExpr.addArguments([
									pathname,
									`jsonStringify(${inputBodyName})`,
									...(hasQuery
										? [`stripUndefined({${queryParameterNames.join(", ")}})`]
										: []),
								]);
							} else if (hasNonJsonBody) {
								callExpr.addArguments([
									pathname,
									nonJsonBodyPropName,
									...(hasQuery
										? [`stripUndefined({${queryParameterNames.join(", ")}})`]
										: []),
								]);
							} else if (hasQuery) {
								callExpr.addArguments([
									pathname,
									emptyKeyword,
									...(hasQuery
										? [`stripUndefined({${queryParameterNames.join(", ")}})`]
										: []),
								]);
							} else {
								callExpr.addArguments([pathname]);
							}
						}
					}
				}
			}
		}
	}

	const isInput = (t: TypeAliasDeclaration | InterfaceDeclaration) =>
		t.getName()?.endsWith("Input");
	// const isOutput = (t: string) => t.endsWith('Output');

	const inputTypes = typesFile.getTypeAliases().filter((t) => isInput(t));
	const inputUnion = createUnion(
		...new Set(inputTypes.sort().map((t) => t.getName())),
	);
	const outputUnion = createUnion(
		...[...outputTypes].map((t) => (typeof t === "string" ? t : t.getName())),
	);

	const allInputs = inputUnion
		? mainFile.addTypeAlias({
				name: "AllInputs",
				type: inputUnion,
			})
		: undefined;

	const allOutputs = outputUnion
		? mainFile.addTypeAlias({
				name: "AllOutputs",
				type: outputUnion,
			})
		: undefined;

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

	const namedImports = [...new Set([...inputTypes, ...outputTypes])].filter(
		<T>(t: T | string | typeof unspecifiedKeyword): t is T =>
			typeof t !== "string",
	);

	if (namedImports.length > 0) {
		mainFile.addImportDeclaration({
			moduleSpecifier: typesModuleSpecifier,
			namedImports: namedImports
				.sort((a, b) => a.getName().localeCompare(b.getName()))
				.map((t) => ({
					name: t.getName(),
				})),
			isTypeOnly: true,
		});
	}

	const clientClassDeclaration = mainFile.addClass({
		name: pascalCase(schema.info.title, "RestClient"),
		isExported: true,
		extends: `${serviceClientClassName}<${allInputs?.getName() || unspecifiedKeyword}, ${
			allOutputs?.getName() || unspecifiedKeyword
		}>`,
	});

	const ctor = clientClassDeclaration.addConstructor();

	const baseUrl = ctor.addParameter({
		name: "baseUrl",
		type: Writers.unionType("string", "URL"),
		initializer: `new URL('${new URL(
			`${schema.servers?.[0]?.url || "https://api.example.com"}/`,
		)}')`,
	});

	// const fetcherParam = ctor.addParameter({
	//   name: 'fetcher',
	//   // type: fetcherMethodType,
	//   initializer: `${fetcherName}()`,
	// });

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
		callExpr?.addArguments([
			baseUrl.getName(),
			// fetcherParam.getName(),
			configParam.getName(),
		]);
	}

	mainFile.organizeImports();

	// tidies up any unused type-fest imports
	typesFile.fixUnusedIdentifiers();
	commandsFile.fixUnusedIdentifiers();
	valibotFile.fixUnusedIdentifiers();

	// Generate hono-valibot file
	const honoValibotFile = createHonoValibotFile(project, outputDir);

	// Collect all schema names needed
	const schemaImports = new Set<string>();
	for (const op of allOperations) {
		for (const schemaName of Object.values(op.schemas)) {
			if (schemaName) {
				schemaImports.add(schemaName);
			}
		}
	}

	// Add imports from valibot.ts
	addValibotImportsToHonoValibotFile(honoValibotFile, [...schemaImports]);

	// Generate middleware exports for each operation
	for (const op of allOperations) {
		createHonoValibotMiddleware(honoValibotFile, op.exportName, op.schemas);
	}

	honoValibotFile.fixUnusedIdentifiers();

	return {
		commandsFile,
		typesFile,
		mainFile,
		valibotFile,
		honoValibotFile,
		enumsFile,
	};
}
