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
  typesFile.addImportDeclaration({
    namedImports: ['JsonObject', 'JsonValue'],
    moduleSpecifier: 'type-fest',
    isTypeOnly: true,
  });

  typesFile.addTypeAlias({
    name: 'RequestMethod',
    isExported: true,
    typeParameters: [{ name: 'T', default: 'any' /* , constraint: 'void'  */ }],
    type: '(params: RequestParams) => Promise<T>',
  });

  const httpMethodType = typesFile.addTypeAlias({
    name: 'HttpMethod',
    isExported: true,
    type: Writers.unionType("'get'", "'post'", "'put'", "'delete'", "'head'"),
  });

  typesFile.addTypeAlias({
    name: 'RequestParams',
    isExported: true,
    typeParameters: [
      { name: 'Q', default: 'Record<string, string>', constraint: 'never' },
      { name: 'B', default: 'JsonValue', constraint: 'never' },
    ],

    type: Writers.objectType({
      properties: [
        { name: 'pathname', type: 'string' },
        { name: 'method', type: httpMethodType.getName() },
        // { name: 'params', type: 'string', hasQuestionToken: true },
        { name: 'query', type: 'Q', hasQuestionToken: true },
        { name: 'body', type: 'JsonValue', hasQuestionToken: true },
        {
          name: 'headers',
          type: 'Record<string, string>',
          hasQuestionToken: true,
        },
      ],
    }),
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
      namedImports: ['RequestMethod'],
    });

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

          if (queryParameters.length > 0) {
            const queryType = typesFile.addTypeAlias({
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

            typesImportDecl.addNamedImport(queryType.getName());

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

            const theRef = arrayRef || regularRef;

            if (theRef) {
              const type = typesAndInterfaces.get(theRef);

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

              const typeName = `${type?.getName() || 'void'}${
                arrayRef ? '[]' : ''
              }`;

              const retVal = `(requestMethod: RequestMethod<${typeName}>) => Promise<${typeName}>`;

              func.setReturnType(retVal);

              jsdoc.addTag({
                tagName: 'returns',
                text: `{${retVal}} HTTP ${statusCode}`,
              });
            } else {
              const retVal =
                '(requestMethod: RequestMethod<void>) => Promise<void>';

              func.setReturnType(retVal);

              jsdoc.addTag({
                tagName: 'returns',
                text: `{${retVal}} HTTP ${statusCode}`,
              });
            }

            func.addVariableStatement({
              declarationKind: VariableDeclarationKind.Const,
              declarations: [
                {
                  name: 'req',
                  initializer: Writers.object({
                    method: Writers.assertion((w) => w.quote(method), 'const'),
                    pathname: `\`${path.replaceAll(/\{/g, '${')}\``,
                    query: Writers.object({
                      one: (writer) => writer.quote('1'),
                    }),
                    // query: {},
                    // body: {},
                  }),
                },
              ],
            });

            func.addStatements((writer) => {
              writer.writeLine('return (requestMethod) => requestMethod(req);');
            });
          }
        }
      }
    }
  }
}
