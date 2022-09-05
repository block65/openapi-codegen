/* eslint-disable no-restricted-syntax */
import { relative } from 'node:path';
import camelcase from 'camelcase';
import type { OpenAPIV3 } from 'openapi-types';
import {
  InterfaceDeclaration,
  SourceFile,
  TypeAliasDeclaration,
  VariableDeclarationKind,
  Writers,
} from 'ts-morph';
import { processSchemaObject } from './process-schema.js';
import {
  maybeJsDocDescription,
  schemaIsOrHasReferenceObject,
} from './utils.js';

export async function processOpenApiDocument(
  entryFile: SourceFile,
  typesFile: SourceFile,
  schema: OpenAPIV3.Document,
): Promise<void> {
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
    processSchemaObject(
      typesAndInterfaces,
      typesFile,
      schemaName,
      schemaObject,
    );
  }

  for (const [path, pathItemObject] of Object.entries(schema.paths)) {
    if (pathItemObject) {
      for (const [method, operationObject] of Object.entries(pathItemObject)) {
        if (
          typeof operationObject === 'object' &&
          'operationId' in operationObject
        ) {
          const func = entryFile
            .addFunction({
              name: camelcase(operationObject.operationId),
              isExported: true,
            })
            .setIsAsync(true);

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

          if (
            !operationObject.responses ||
            Object.keys(operationObject.responses).length === 0
          ) {
            func.setReturnType('Promise<void>');
          }

          const index =
            entryFile
              .getFunction(func.getName() || 'INVALID')
              ?.getChildIndex() || 0;

          if (queryParameters.length > 0) {
            const queryType = entryFile.insertTypeAlias(index, {
              name: camelcase(`${func.getName() || 'INVALID'}Query`, {
                pascalCase: true,
              }),
              isExported: true,
              type: Writers.objectType({
                properties: queryParameters.map((qp) => ({
                  name: camelcase(qp.name),
                  hasQuestionToken: !qp.required,
                  type:
                    (qp.schema &&
                      '$ref' in qp.schema &&
                      typesAndInterfaces.get(qp.schema.$ref)?.getName()) ||
                    'never',
                })),
              }),
            });

            func.addParameter({
              name: 'query',
              type: queryType.getName(),
              hasQuestionToken: true,
            });
          }

          for (const queryParam of queryParameters) {
            const queryParameterName = camelcase(queryParam.name);

            jsdoc.addTag({
              tagName: 'param',
              text: `query.${queryParameterName}${
                queryParam.required ? '' : '?'
              } {String} ${maybeJsDocDescription(
                queryParam.deprecated && 'DEPRECATED',
                queryParam.description,
                String(queryParam.example),
              )}`.trim(),
            });
          }

          for (const [contentType, response] of Object.entries(
            operationObject.responses,
          )) {
            // we dont support refs as operations
            if ('$ref' in response) {
              break;
            }

            // we only support json right now
            if (contentType !== 'application/json') {
              break;
            }

            const jsonResponse = response.content?.[contentType];

            if (!jsonResponse) {
              func.setReturnType('Promise<void>');
            }

            if (jsonResponse?.schema && '$ref' in jsonResponse.schema) {
              const type = typesAndInterfaces.get(jsonResponse.schema.$ref);

              const retVal = `Promise<${type?.getName() || 'void'}>`;

              func.setReturnType(retVal);

              jsdoc.addTag({
                tagName: 'returns',
                text: `{${retVal}}`,
              });

              if (type) {
                entryFile.addImportDeclaration({
                  moduleSpecifier: relative(
                    entryFile.getFilePath(),
                    typesFile.getFilePath(),
                  ),
                  namedImports: [type.getName()],
                });

                func.addVariableStatement({
                  declarationKind: VariableDeclarationKind.Const,
                  declarations: [
                    {
                      name: 'req1',
                      initializer: Writers.object({
                        method: (writer) => writer.quote(method),
                        url: (writer) => writer.quote(path),
                        params: () =>
                          Writers.object({
                            one: (writer) => writer.quote('1'),
                          }),
                        // query: {},
                        // body: {},
                      }),
                    },
                    {
                      name: 'req',
                      initializer: Writers.object({
                        method: (writer) => writer.quote(method),
                        url: (writer) => writer.quote(path),
                        params: () =>
                          Writers.object({
                            one: (writer) => writer.quote('1'),
                          }),
                        // query: {},
                        // body: {},
                      }),
                    },
                  ],
                });
              }
            }
          }
        }
      }
    }
  }
}
