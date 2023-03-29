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
import { registerTypesFromSchema, schemaToType } from './process-schema.js';
import {
  maybeJsDocDescription,
  schemaIsOrHasReferenceObject,
  schemaIsOrHasReferenceObjectsExclusively,
  wordWrap,
} from './utils.js';

export async function processOpenApiDocument(
  entryFile: SourceFile,
  typesFile: SourceFile,
  schema: OpenAPIV3.Document,
  tags?: string[] | undefined,
): Promise<void> {
  const refs = await $RefParser.default.resolve(schema);

  entryFile.addImportDeclaration({
    namedImports: ['RequestMethodCaller'],
    moduleSpecifier: '@block65/rest-client',
    isTypeOnly: true,
  });

  entryFile.addImportDeclaration({
    namedImports: ['Simplify'],
    moduleSpecifier: 'type-fest',
    isTypeOnly: true,
  });

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
      if (
        type &&
        !typesImportDecl
          .getNamedImports()
          .some((namedImport) => namedImport.getName() === type.getName())
      ) {
        typesImportDecl?.addNamedImport(type.getName());
        typesImportDecl.setIsTypeOnly(true);
      }
    }
  };

  const typesAndInterfaces = new Map<
    string,
    InterfaceDeclaration | TypeAliasDeclaration
  >();

  for (const [schemaName, schemaObject] of Object.entries(
    schema.components?.schemas || {},
  )
    .sort(([, a], [, b]) => {
      if (schemaIsOrHasReferenceObject(a) && !schemaIsOrHasReferenceObject(b)) {
        return 1;
      }
      if (!schemaIsOrHasReferenceObject(a) && schemaIsOrHasReferenceObject(b)) {
        return -1;
      }

      return 0;
    })
    .sort(([, a]) => (schemaIsOrHasReferenceObjectsExclusively(a) ? 1 : 0))) {
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
          const func = entryFile.addFunction({
            name: camelcase(
              `${operationObject.operationId.replace(/command$/i, '')} Command`,
            ),
            isExported: true,
            isAsync: false,
          });

          const jsdoc = func.addJsDoc({
            description: `\n${wordWrap(
              operationObject.description || operationObject.operationId,
            )}\n\n`,

            tags: [
              ...(operationObject.summary
                ? [
                    {
                      tagName: 'summary',
                      text: wordWrap(operationObject.summary),
                    },
                  ]
                : []),
              ...(operationObject.deprecated
                ? [
                    {
                      tagName: 'deprecated',
                    },
                  ]
                : []),
            ],
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

          const queryParameters: OpenAPIV3.ParameterObject[] = [];

          const parameters = [
            ...(operationObject.parameters || []),
            ...(pathItemObject.parameters || []),
          ];

          for (const parameter of parameters) {
            const resolvedParameter =
              '$ref' in parameter
                ? (refs.get(parameter.$ref) as any)
                : parameter;

            const parameterName = camelcase(resolvedParameter.name);

            if (resolvedParameter.in === 'path') {
              func.addParameter({
                name: parameterName,
                type: 'string',
              });

              jsdoc.addTag({
                tagName: 'param',
                text: wordWrap(
                  `${parameterName} {String} ${
                    resolvedParameter.description || ''
                  }`,
                ).trim(),
              });
            }

            if (resolvedParameter.in === 'query') {
              queryParameters.push(resolvedParameter);
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
                        {
                          // query parameters can't be strictly "boolean"
                          booleanAsStringish: true,
                          integerAsStringish: true,
                        },
                      );

                      return type;
                    }),
                  }),
                })
              : undefined;

          const hasRequiredQueryParam = queryParameters.some((p) => p.required);

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

          const paramsParamName = 'parameters';

          if (bodyType || queryType) {
            const paramsHasQuestionToken = !bodyType && !hasRequiredQueryParam;
            func.addParameter({
              name: paramsParamName,
              hasQuestionToken: paramsHasQuestionToken,
              type: Writers.objectType({
                properties: [
                  ...(bodyType
                    ? [
                        {
                          name: 'body',
                          type: `Simplify<${bodyType.getName()}>${
                            requestBodyIsArray ? '[]' : ''
                          }`,
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
            });
          }

          if (bodyType) {
            jsdoc.addTag({
              tagName: 'param',
              text: wordWrap(
                `${paramsParamName}.body {${bodyType.getName()}} ${maybeJsDocDescription()}`,
              ).trim(),
            });
          }

          for (const queryParam of queryParameters) {
            const queryParameterName = camelcase(queryParam.name);

            jsdoc.addTag({
              tagName: 'param',
              text: wordWrap(
                `${paramsParamName}.query.${queryParameterName}${
                  queryParam.required ? '' : '?'
                } {String} ${maybeJsDocDescription(
                  queryParam.deprecated && 'DEPRECATED',
                  queryParam.description,
                  String(queryParam.example || ''),
                )}`,
              ).trim(),
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
          ).filter(([s]) => s.startsWith('2'))) {
            // early out if response is 204
            if (statusCode === '204') {
              func.setReturnType('RequestMethodCaller<void>');
              break;
            }

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
                  pathname: `\`${path
                    .replaceAll(/\{(\w+)\}/g, camelcase)
                    .replaceAll(/{/g, '${')}\``,
                  ...(queryType && {
                    query: `${paramsParamName}?.query`,
                  }),
                  ...(bodyType && { body: `${paramsParamName}.body` }),
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
