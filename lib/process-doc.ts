/* eslint-disable no-restricted-syntax */
import { relative } from 'node:path';
import camelcase from 'camelcase';
import $RefParser from 'json-schema-ref-parser';
import type { OpenAPIV3 } from 'openapi-types';
import {
  InterfaceDeclaration,
  SourceFile,
  TypeAliasDeclaration,
  VariableDeclarationKind,
  Writers,
} from 'ts-morph';
import { registerTypesFromSchema } from './process-schema.js';
import {
  maybeJsDocDescription,
  schemaIsOrHasReferenceObject,
} from './utils.js';

export async function processOpenApiDocument(
  entryFile: SourceFile,
  typesFile: SourceFile,
  schema: OpenAPIV3.Document,
  tags?: string[] | undefined,
): Promise<void> {
  const refs = await $RefParser.default.resolve(schema);
  // const schema = (await $RefParser.default.dereference(
  //   rawSchema,
  // )) as OpenAPIV3.Document;

  const typesModuleSpecifier =
    `./${typesFile.getBaseNameWithoutExtension()}.js` ||
    relative(entryFile.getDirectoryPath(), typesFile.getFilePath());

  const typesImportDecl =
    entryFile.getImportDeclaration(
      (decl) =>
        decl.getModuleSpecifier().getLiteralValue() === typesModuleSpecifier,
    ) ||
    entryFile.addImportDeclaration({
      moduleSpecifier: typesModuleSpecifier,
      namedImports: [],
    });

  const ensureImport = (
    ...types: (TypeAliasDeclaration | InterfaceDeclaration | undefined)[]
  ) => {
    for (const type of types) {
      if (type) {
        // add the import if its not already added
        if (
          !typesImportDecl
            .getNamedImports()
            .find((i) => i.getName() === type.getName())
        ) {
          typesImportDecl?.addNamedImport(type.getName());
          // .setIsTypeOnly(true);

          typesImportDecl.setIsTypeOnly(true);
        }
      }
    }
  };

  // typesFile.addImportDeclaration({
  //   namedImports: [/* 'JsonObject',  */ 'JsonValue'],
  //   moduleSpecifier: 'type-fest',
  //   isTypeOnly: true,
  // });

  entryFile.addImportDeclaration({
    namedImports: ['Simplify'],
    moduleSpecifier: 'type-fest',
    isTypeOnly: true,
  });

  const httpMethodType = typesFile.addTypeAlias({
    name: 'HttpMethod',
    isExported: true,
    type: Writers.unionType("'get'", "'post'", "'put'", "'delete'", "'head'"),
  });

  const requestParamsType = typesFile.addTypeAlias({
    name: 'RequestParams',
    isExported: true,
    type: Writers.objectType({
      properties: [
        { name: 'pathname', type: 'string' },
        { name: 'method', type: httpMethodType.getName() },
        {
          name: 'query',
          type: 'Record<string, string | number> | undefined',
          hasQuestionToken: true,
        },
        { name: 'body', type: 'unknown', hasQuestionToken: true },
        {
          name: 'headers',
          type: 'Record<string, string>',
          hasQuestionToken: true,
        },
      ],
    }),
  });

  const runtimeOptionsType = typesFile.addTypeAlias({
    name: 'RuntimeOptions',
    isExported: true,
    type: Writers.objectType({
      properties: [
        { name: 'signal', type: 'AbortSignal', hasQuestionToken: true },
      ],
    }),
  });

  const requestMethodType = typesFile.addTypeAlias({
    name: 'RequestMethod',
    isExported: true,
    typeParameters: [{ name: 'T', default: 'any' /* , constraint: 'void'  */ }],
    type: `(params: ${requestParamsType.getName()}, options?: ${runtimeOptionsType.getName()}) => Promise<T>`,
  });

  const requestMethodCaller = typesFile.addTypeAlias({
    name: 'RequestMethodCaller',
    isExported: true,
    typeParameters: [
      { name: 'T', default: 'unknown' /* , constraint: 'void'  */ },
    ],
    type: `(requestMethod: ${requestMethodType.getName()}<T>, options?: ${runtimeOptionsType.getName()}) => Promise<T>`,
  });

  ensureImport(/* requestParamsType */ requestMethodCaller);

  const typesAndInterfaces = new Map<
    string,
    InterfaceDeclaration | TypeAliasDeclaration
  >();

  for (const [schemaName, schemaObject] of Object.entries(
    schema.components?.schemas || {},
  ).sort(([, a], [, b]) => {
    if (!schemaIsOrHasReferenceObject(a) && schemaIsOrHasReferenceObject(b)) {
      return -1;
    }

    if (schemaIsOrHasReferenceObject(a) && !schemaIsOrHasReferenceObject(b)) {
      return 1;
    }

    return 0;
  })) {
    registerTypesFromSchema(
      typesAndInterfaces,
      typesFile,
      schemaName,
      schemaObject,
      refs,
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
          const func = entryFile.addFunction({
            name: camelcase(operationObject.operationId),
            isExported: true,
            isAsync: false,
          });

          const jsdoc = func.addJsDoc({
            description: `${
              operationObject.description || operationObject.operationId
            }\n`,
          });

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

          const requestBodyObjectJson =
            requestBodyObject?.content['application/json'];

          const requestBodyObjectJsonSchemaRef =
            requestBodyObjectJson?.schema &&
            '$ref' in requestBodyObjectJson.schema
              ? requestBodyObjectJson?.schema
              : undefined;

          const queryParameters: OpenAPIV3.ParameterObject[] = [];

          for (const parameter of operationObject.parameters || []) {
            if ('$ref' in parameter) {
              break;
            }

            const parameterName = camelcase(parameter.name);

            if (parameter.in === 'path') {
              func.addParameter({
                name: parameterName,
                type: 'string',
              });

              jsdoc.addTag({
                tagName: 'param',
                text: `${parameterName} {String} ${
                  parameter.description || ''
                }`.trim(),
              });
            }

            if (parameter.in === 'query') {
              queryParameters.push(parameter);
            }
          }

          // const restParam = func.addParameter({
          //   name: 'rest',
          //   // type: queryType.getName(),
          //   // hasQuestionToken: true,
          //   initializer: Writers.object({}),
          // });

          // restParam.getType().set.

          const queryType =
            queryParameters.length > 0
              ? typesFile.addTypeAlias({
                  name: camelcase(`${func.getName() || 'INVALID'}Query`, {
                    pascalCase: true,
                  }),
                  isExported: true,
                  type: Writers.objectType({
                    properties: queryParameters.map((qp) => {
                      if (!qp.schema) {
                        return {
                          name: camelcase(qp.name),
                          hasQuestionToken: false,
                        };
                      }

                      const type = schemaToType(
                        typesAndInterfaces,
                        qp.required ? { required: [qp.name] } : {},
                        qp.name,
                        qp.schema,
                      );

                      return type;
                    }),
                  }),
                })
              : undefined;

          ensureImport(queryType);
          // if (queryType) {
          //   // func.addParameter({
          //   //   name: 'query',
          //   //   type: queryType.getName(),
          //   //   hasQuestionToken: true,
          //   // });
          // }

          const hasRequiredQueryParam = queryParameters.some((p) => p.required);

          const bodyType =
            requestBodyObjectJsonSchemaRef &&
            typesAndInterfaces.get(requestBodyObjectJsonSchemaRef.$ref);

          ensureImport(bodyType);

          const paramsParam =
            bodyType || queryType
              ? func.addParameter({
                  name: 'params',
                  hasQuestionToken: !bodyType && !hasRequiredQueryParam,
                  type: Writers.objectType({
                    properties: [
                      ...(bodyType
                        ? [
                            {
                              name: 'body',
                              type: `Simplify<${bodyType.getName()}>`,
                              hasQuestionToken: false,
                            },
                          ]
                        : []),
                      ...(queryType
                        ? [
                            {
                              name: 'query',
                              type: queryType.getName(),
                              hasQuestionToken: !hasRequiredQueryParam,
                            },
                          ]
                        : []),
                    ],
                  }),
                  // type: `${commandParamsType.getName()}<${
                  //   bodyType?.getName() || 'never'
                  // }, ${queryType?.getName() || 'never'}>`,
                })
              : undefined;

          if (bodyType) {
            jsdoc.addTag({
              tagName: 'param',
              text: `${paramsParam?.getName()}.body {${bodyType.getName()}} ${maybeJsDocDescription()}`.trim(),
            });
          }

          for (const queryParam of queryParameters) {
            const queryParameterName = camelcase(queryParam.name);

            jsdoc.addTag({
              tagName: 'param',
              text: `${paramsParam?.getName()}.query.${queryParameterName}${
                queryParam.required ? '' : '?'
              } {String} ${maybeJsDocDescription(
                queryParam.deprecated && 'DEPRECATED',
                queryParam.description,
                String(queryParam.example || ''),
              )}`.trim(),
            });
          }

          if (
            !operationObject.responses ||
            Object.keys(operationObject.responses).length === 0
          ) {
            func.setReturnType('Promise<unknown>');
          }

          for (const [statusCode, response] of Object.entries(
            operationObject.responses,
          )) {
            // early out if response is 204
            // if (statusCode === '204') {
            //   func.setReturnType('Promise<void>');
            //   break;
            // }

            // we dont support refs as response objects
            if ('$ref' in response) {
              break;
            }

            const jsonResponse = response.content?.['application/json'];

            // this can happen if there is no response at all
            // because an empty response does not have a content type
            // if (!jsonResponse) {
            //   func.setReturnType('Promise<void>');
            // }

            const arrayRef =
              jsonResponse?.schema &&
              'items' in jsonResponse.schema &&
              '$ref' in jsonResponse.schema.items &&
              jsonResponse.schema.items.$ref;

            const regularRef =
              jsonResponse?.schema &&
              '$ref' in jsonResponse.schema &&
              jsonResponse.schema.$ref;

            const responseRef = arrayRef || regularRef;

            if (responseRef) {
              const type = typesAndInterfaces.get(responseRef);

              ensureImport(type);

              const typeName = `${type?.getName() || 'void'}${
                arrayRef ? '[]' : ''
              }`;

              const retVal = `RequestMethodCaller<${typeName}>`;

              func.setReturnType(retVal);

              jsdoc.addTag({
                tagName: 'returns',
                text: `{${retVal}} HTTP ${statusCode}`,
              });
            } else {
              const retVal = 'RequestMethodCaller<void>';

              func.setReturnType(retVal);

              jsdoc.addTag({
                tagName: 'returns',
                text: `{${retVal}} HTTP ${statusCode}`,
              });
            }
          }

          func.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
              {
                name: 'req',
                initializer: Writers.object({
                  method: Writers.assertion((w) => w.quote(method), 'const'),
                  pathname: `\`${path.replaceAll(/\{/g, '${')}\``,
                  ...(queryType &&
                    paramsParam && {
                      query: `${paramsParam.getName()}?.query`,
                    }),
                  ...(bodyType &&
                    paramsParam && { body: `${paramsParam.getName()}.body` }),
                }),
              },
            ],
          });

          func.addStatements((writer) => {
            writer.writeLine(
              'return (requestMethod, options) => requestMethod(req, options);',
            );
          });
        }
      }
    }
  }
}
