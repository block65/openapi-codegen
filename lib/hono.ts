import { join } from "node:path";
import type { QueryParamSpec } from "@block65/rest-client";
import camelcase from "camelcase";
import type { Project, SourceFile } from "ts-morph";
import { VariableDeclarationKind } from "ts-morph";
import { typedEntries } from "./utils.ts";

export function createHonoFile(
	project: Project,
	outputDir: string,
): SourceFile {
	const file = project.createSourceFile(join(outputDir, "hono.ts"), "", {
		overwrite: true,
	});

	file.addImportDeclaration({
		moduleSpecifier: "hono/validator",
		namedImports: ["validator"],
	});

	file.addImportDeclaration({
		moduleSpecifier: "@standard-schema/spec",
		namedImports: ["StandardSchemaV1"],
		isTypeOnly: true,
	});

	// fixUnusedIdentifiers prunes these two where every query parameter is a
	// scalar, because then nothing calls parseQuery
	file.addImportDeclaration({
		moduleSpecifier: "@block65/rest-client",
		namedImports: [
			"PublicValidationError",
			"parseQuery",
			{ name: "QueryParamSpec", isTypeOnly: true },
		],
	});

	file.addFunction({
		name: "standardParse",
		isAsync: true,
		typeParameters: [{ name: "TSchema", constraint: "StandardSchemaV1" }],
		parameters: [
			{ name: "schema", type: "TSchema" },
			{ name: "value", type: "unknown" },
		],
		statements: `
      const result = await schema["~standard"].validate(value);
      if (result.issues) {
        throw PublicValidationError.fromIssues(result.issues);
      }
      return result.value;
    `,
	});

	return file;
}

export function createHonoMiddleware(
	honoFile: SourceFile,
	exportName: string,
	schemas: {
		json?: string;
		response?: string;
		param?: string;
		query?: string;
		header?: string;
	},
	queryParams: QueryParamSpec[] = [],
): void {
	const name = camelcase(exportName);

	// A parameter beyond a plain scalar needs a spec. A scalar reaches the
	// validator as the string it was sent as, under every style
	if (schemas.query && queryParams.length > 0) {
		honoFile.addVariableStatement({
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name: `${name}QueryParams`,
					initializer: `${JSON.stringify(queryParams)} as const satisfies readonly QueryParamSpec[]`,
				},
			],
		});
	}

	honoFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name,
				initializer: (writer) => {
					writer.write("[");
					writer.indent(() => {
						// Hono validators run on inbound request data alone. Response
						// schemas are emitted for client-side consumption, and `header`
						// is skipped so extra HTTP headers pass
						for (const [target, schemaName] of typedEntries(schemas).filter(
							([t]) => t !== "header" && t !== "response",
						)) {
							const value =
								target === "query" && queryParams.length > 0
									? `parseQuery(value, ${name}QueryParams)`
									: "value";
							writer.writeLine(
								`validator(${JSON.stringify(target)}, (value) => standardParse(${schemaName}, ${value})),`,
							);
						}
					});
					writer.write("] as const");
				},
			},
		],
	});
}

export function addSchemaImportsToHonoFile(
	honoFile: SourceFile,
	schemaNames: string[],
) {
	if (schemaNames.length === 0) {
		return;
	}

	honoFile.addImportDeclaration({
		moduleSpecifier: "./valibot.js",
		namedImports: schemaNames.toSorted(),
	});
}
