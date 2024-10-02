/* eslint-disable no-restricted-syntax */
import { join, relative } from 'node:path';
import { $RefParser } from '@apidevtools/json-schema-ref-parser';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import toposort from 'toposort';
import {
  InterfaceDeclaration,
  Node,
  Project,
  Scope,
  StructureKind,
  SyntaxKind,
  TypeAliasDeclaration,
  VariableDeclarationKind,
  Writers,
} from 'ts-morph';
import { registerTypesFromSchema, schemaToType } from './process-schema.js';
import {
  castToValidJsIdentifier,
  getDependents,
  pascalCase,
  wordWrap,
} from './utils.js';

// the union/intersect helpers keep typescript happy due to ts-morph typings
function createIntersection(...types: (string | undefined)[]) {
  // create a type  of all the inputs
  const [type1, type2, ...typeX] = types.filter((t): t is string => !!t);
  return (
    (type1 && type2
      ? Writers.intersectionType(type1, type2, ...typeX)
      : type1) || 'never'
  );
}

// the union/intersect helpers keep typescript happy due to ts-morph typings
function createUnion(...types: (string | undefined)[]) {
  // create a type  of all the inputs
  const [type1, type2, ...typeX] = types
    .filter((t): t is string => !!t)
    .sort((a, b) => a.localeCompare(b));
  return type1 && type2 ? Writers.unionType(type1, type2, ...typeX) : type1;
}

function isUnspecifiedKeyword(type: TypeAliasDeclaration) {
  return type?.getTypeNode()?.getKind() === SyntaxKind.UnknownKeyword;
}

const unspecifiedKeyword = 'unknown' as const;

export async function processOpenApiDocument(
  outputDir: string,
  schema: OpenAPIV3_1.Document,
  tags?: string[] | undefined,
) {
  const project = new Project();

  const commandsFile = project.createSourceFile(
    join(outputDir, 'commands.ts'),
    '',
    {
      overwrite: true,
    },
  );

  const typesFile = project.createSourceFile(
    join(outputDir, 'types.ts'),
    '',

    {
      overwrite: true,
    },
  );

  const mainFile = project.createSourceFile(join(outputDir, 'main.ts'), '', {
    overwrite: true,
  });

  const outputTypes = new Set<
    InterfaceDeclaration | TypeAliasDeclaration | typeof unspecifiedKeyword
  >();

  const refs = await $RefParser.resolve(schema);

  commandsFile.addImportDeclaration({
    namedImports: [
      // command classes
      'Command',
    ],
    moduleSpecifier: '@block65/rest-client',
  });

  commandsFile.addImportDeclaration({
    namedImports: ['Jsonifiable'],
    moduleSpecifier: 'type-fest',
    isTypeOnly: true,
  });

  typesFile.addImportDeclaration({
    namedImports: ['Jsonifiable', 'Jsonify'],
    moduleSpecifier: 'type-fest',
    isTypeOnly: true,
  });

  typesFile.addImportDeclaration({
    namedImports: ['JsonifiableObject'],
    moduleSpecifier: 'type-fest/source/jsonifiable.js',
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
      sorted.findIndex(
        (schemaName) => schemaName === `#/components/schemas/${a}`,
      ) -
      sorted.findIndex(
        (schemaName) => schemaName === `#/components/schemas/${b}`,
      ),
  );

  for (const [schemaName, schemaObject] of sortedSchemas) {
    registerTypesFromSchema(
      typesAndInterfaces,
      typesFile,
      schemaName,
      schemaObject,
    );
  }

  for (const [path, pathItemObject] of Object.entries(schema.paths || {})) {
    if (pathItemObject) {
      for (const [method, operationObject] of Object.entries(
        pathItemObject,
      ).filter(
        ([, o]) =>
          !tags ||
          (typeof o === 'object' && 'tags' in o
            ? o.tags.some((t) => tags.includes(t))
            : false),
      )) {
        if (
          typeof operationObject === 'object' &&
          'operationId' in operationObject
        ) {
          const pathParameters: OpenAPIV3.ParameterObject[] = [];

          const operationId = pascalCase(
            `${operationObject.operationId.replace(/command$/i, '')} Command`,
          );

          const commandClassDeclaration = commandsFile.addClass({
            name: operationId,
            isExported: true,
            extends: 'Command',
            properties: [
              {
                name: 'method',
                initializer: Writers.assertion((w) => w.quote(method), 'const'),
                hasOverrideKeyword: true,
                scope: Scope.Public,
              },
            ],
          });
          const ctor = commandClassDeclaration.addConstructor();

          // classs.getExtends()?.addTypeArguments(['never', 'never']);

          const jsDocStructure = {
            description: `\n${wordWrap(
              operationObject.description || operationId,
            )}\n`,

            tags: [
              ...(operationObject.summary
                ? [
                    {
                      tagName: 'summary',
                      text: wordWrap(operationObject.summary),
                    },
                  ]
                : []),
            ],
          };

          const jsdoc = commandClassDeclaration.addJsDoc(jsDocStructure);

          if (operationObject.deprecated) {
            jsdoc.addTag({
              tagName: 'deprecated',
            });
          }

          const requestBodyObject =
            operationObject.requestBody &&
            !('$ref' in operationObject.requestBody)
              ? operationObject.requestBody
              : undefined;

          const queryParameters: OpenAPIV3.ParameterObject[] = [];

          for (const parameter of [
            ...(operationObject.parameters || []),
            ...(pathItemObject.parameters || []),
          ]) {
            const resolvedParameter: OpenAPIV3.ParameterObject =
              '$ref' in parameter ? refs.get(parameter.$ref) : parameter;

            if (resolvedParameter.in === 'path') {
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

            if (resolvedParameter.in === 'query') {
              queryParameters.push(resolvedParameter);
            }
          }

          const queryType =
            queryParameters.length > 0
              ? typesFile.addTypeAlias({
                  name: pascalCase(
                    `${commandClassDeclaration.getName() || 'INVALID'}Query`,
                  ),
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

                      if (qp.required) {
                        return type;
                      }

                    }),
                  }),
                })
              : undefined;
          ensureImport(queryType);

          const requestBodyObjectJson =
            requestBodyObject?.content['application/json'];

          const requestBodyIsArray =
            requestBodyObjectJson?.schema &&
            'type' in requestBodyObjectJson.schema &&
            requestBodyObjectJson.schema?.type === 'array';

          // get the ref from the schema or the array items
          const requestBodyObjectJsonSchema =
            (requestBodyObjectJson?.schema &&
              (('$ref' in requestBodyObjectJson.schema &&
                requestBodyObjectJson?.schema) ||
                (requestBodyIsArray &&
                  'items' in requestBodyObjectJson.schema &&
                  '$ref' in requestBodyObjectJson.schema.items &&
                  requestBodyObjectJson.schema.items))) ||
            undefined;

          const bodyType =
            requestBodyObjectJsonSchema &&
            typesAndInterfaces.get(requestBodyObjectJsonSchema.$ref);

          ensureImport(bodyType);

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
                    `${commandClassDeclaration.getName() || 'INVALID'}Params`,
                  ),
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
                          type: 'string',
                          description:
                            '// TODO: check this? no path param schema was found',
                        },
                        {
                          // parameters can't be strictly "boolean"
                          booleanAsStringish: true,
                          integerAsStringish: true,
                        },
                      );

                      return {
                        name,
                        type: type.type || unspecifiedKeyword,
                      };
                    }),
                  }),
                  isExported: true,
                })
              : null;

          const inputType = typesFile.addTypeAlias({
            name: pascalCase(
              commandClassDeclaration.getName() || 'Invalid',
              'Input',
            ),
            type: createIntersection(
              bodyType?.getName(),
              paramsType?.getName(),
              queryType?.getName(),
            ),
            isExported: true,
          });
          ensureImport(inputType);

          const inputBodyType = typesFile.addTypeAlias({
            name: pascalCase(
              `${commandClassDeclaration.getName() || 'INVALID'}Body`,
            ),
            type: bodyType?.getName() || unspecifiedKeyword, // createIntersection(bodyType?.getName(), queryType?.getName()),
            isExported: true,
          });

          ensureImport(inputBodyType);

          // CommandInput
          commandClassDeclaration
            .getExtends()
            ?.addTypeArgument(
              isUnspecifiedKeyword(inputType)
                ? unspecifiedKeyword
                : inputType.getName(),
            );

          if (!isUnspecifiedKeyword(inputType)) {
            ctor.addParameter({
              name: 'input',
              type: inputType.getName(),
            });
          }

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

          for (const [statusCode, response] of Object.entries(
            operationObject.responses,
          ).filter(([s]) => s.startsWith('2'))) {
            // early out if response is 204
            if (statusCode === '204') {
              commandClassDeclaration
                .getExtends()
                ?.addTypeArgument(unspecifiedKeyword);
              break;
            }

            // we dont support refs as response objects
            if ('$ref' in response) {
              break;
            }

            const jsonResponse = response.content?.['application/json'];

            const arrayRef =
              jsonResponse?.schema &&
              'items' in jsonResponse.schema &&
              '$ref' in jsonResponse.schema.items &&
              jsonResponse.schema.items.$ref;

            const regularRef =
              jsonResponse?.schema &&
              '$ref' in jsonResponse.schema &&
              jsonResponse.schema.$ref;

            const outputRef = arrayRef || regularRef;

            if (outputRef) {
              const outputType = typesAndInterfaces.get(outputRef);

              if (outputType) {
                outputTypes.add(outputType);
                ensureImport(outputType);
              }

              const outputTypeName = `${outputType?.getName()}${
                arrayRef ? '[]' : ''
              }`;

              const retVal = `${outputTypeName}`;
              commandClassDeclaration.getExtends()?.addTypeArgument(retVal);

              // jsdoc.addTag({
              //   tagName: 'returns',
              //   text: `{${retVal}} HTTP ${statusCode}`,
              // });
            } else {
              const retVal = unspecifiedKeyword;
              commandClassDeclaration.getExtends()?.addTypeArgument(retVal);
              outputTypes.add(retVal);

              // jsdoc.addTag({
              //   tagName: 'returns',
              //   text: `{${retVal}} HTTP ${statusCode}`,
              // });
            }
          }

          // body
          commandClassDeclaration
            .getExtends()
            ?.addTypeArgument(inputBodyType.getName());

          // query
          if (queryType) {
            commandClassDeclaration
              .getExtends()
              ?.addTypeArgument(queryType.getName());
          }

          const pathname = `\`${path
            // .replaceAll(/\{(\w+)\}/g, camelcase)
            .replaceAll(/{/g, '${')}\``;

          const bodyName = 'body';
          const ctorArgName =
            ctor.getParameters()[0]?.getName() || unspecifiedKeyword;
          const hasBody = !isUnspecifiedKeyword(inputBodyType);
          const hasQuery =
            queryType &&
            !isUnspecifiedKeyword(queryType) &&
            queryParameters.length > 0;

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

          ctor.addStatements([
            !isUnspecifiedKeyword(inputType)
              ? {
                  kind: StructureKind.VariableStatement,
                  declarationKind: VariableDeclarationKind.Const,
                  declarations: [
                    {
                      kind: StructureKind.VariableDeclaration,
                      initializer: ctorArgName,
                      name:
                        paramsToDestructure.length > 0
                          ? `{${[
                              ...paramsToDestructure,
                              hasBody ? `...${bodyName}` : '',
                            ].join(',')} }`
                          : bodyName,
                    },
                  ],
                }
              : '// no input parameters',
            'super();',
          ]);

          const superKeyword = ctor.getFirstDescendantByKind(
            SyntaxKind.SuperKeyword,
          );

          const callExpr = superKeyword?.getParentIfKindOrThrow(
            SyntaxKind.CallExpression,
          );

          // type narrowing
          if (Node.isCallExpression(callExpr)) {
            callExpr.addArguments(
              hasBody || hasQuery
                ? [
                    pathname,
                    hasBody ? bodyName : 'undefined',
                    ...(hasQuery
                      ? [`{${queryParameterNames.join(', ')}}`]
                      : []),
                  ]
                : [pathname],
            );
          }
        }
      }
    }
  }

  const isInput = (t: TypeAliasDeclaration | InterfaceDeclaration) =>
    t.getName()?.endsWith('Input');
  // const isOutput = (t: string) => t.endsWith('Output');

  const inputTypes = typesFile.getTypeAliases().filter((t) => isInput(t));
  const inputUnion = createUnion(
    ...new Set(inputTypes.sort().map((t) => t.getName())),
  );
  const outputUnion = createUnion(
    ...[...outputTypes].map((t) => (typeof t === 'string' ? t : t.getName())),
  );

  const allInputs = inputUnion
    ? mainFile.addTypeAlias({
        name: 'AllInputs',
        type: inputUnion,
      })
    : undefined;

  const allOutputs = outputUnion
    ? mainFile.addTypeAlias({
        name: 'AllOutputs',
        type: outputUnion,
      })
    : undefined;

  const serviceClientClassName = 'RestServiceClient';
  const fetcherName = 'createIsomorphicNativeFetcher';
  const configType = 'RestServiceClientConfig';

  mainFile.addImportDeclaration({
    moduleSpecifier: '@block65/rest-client',
    namedImports: [
      serviceClientClassName,
      fetcherName,
      {
        name: configType,
        isTypeOnly: true,
      },
    ],
  });

  const namedImports = [...new Set([...inputTypes, ...outputTypes])];

  if (namedImports.length > 0) {
    mainFile.addImportDeclaration({
      moduleSpecifier: typesModuleSpecifier,
      namedImports: namedImports
        .filter(
          <T>(t: T | typeof unspecifiedKeyword): t is T =>
            t !== unspecifiedKeyword,
        )
        .map((t) => ({
          name: t.getName(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      isTypeOnly: true,
    });
  }

  const clientClassDeclaration = mainFile.addClass({
    name: pascalCase(schema.info.title, 'RestClient'),
    isExported: true,
    extends: `${serviceClientClassName}<${allInputs?.getName() || unspecifiedKeyword}, ${
      allOutputs?.getName() || unspecifiedKeyword
    }>`,
  });

  const ctor = clientClassDeclaration.addConstructor();

  const baseUrl = ctor.addParameter({
    name: 'baseUrl',
    type: Writers.unionType('string', 'URL'),
    initializer: `new URL('${new URL(
      `${schema.servers?.[0]?.url || 'https://api.example.com'}/`,
    )}')`,
  });

  // const fetcherParam = ctor.addParameter({
  //   name: 'fetcher',
  //   // type: fetcherMethodType,
  //   initializer: `${fetcherName}()`,
  // });

  const configParam = ctor.addParameter({
    name: 'config',
    type: configType,
    hasQuestionToken: true,
  });

  ctor.addStatements(['super();']);

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

  return { commandsFile, typesFile, mainFile };
}
