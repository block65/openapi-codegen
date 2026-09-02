import { join } from "node:path";
import camelcase from "camelcase";
import type { Project, SourceFile } from "ts-morph";
import { VariableDeclarationKind } from "ts-morph";

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

	file.addImportDeclaration({
		moduleSpecifier: "@block65/rest-client",
		namedImports: ["PublicValidationError"],
	});

	file.addFunction({
		name: "standardParse",
		isAsync: true,
		typeParameters: [{ name: "TSchema", constraint: "StandardSchemaV1" }],
		parameters: [
			{ name: "schema", type: "TSchema" },
			{ name: "value", type: "unknown" },
		],
		returnType: "Promise<StandardSchemaV1.InferOutput<TSchema>>",
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
): void {
	honoFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: camelcase(exportName),
				initializer: (writer) => {
					writer.write("[");
					writer.indent(() => {
						// Hono validators only run on inbound request data; response
						// schemas are emitted for client-side consumption only, and
						// `header` is intentionally skipped (extra HTTP headers ok).
						for (const [target, schemaName] of Object.entries(schemas).filter(
							([t]) => t !== "header" && t !== "response",
						)) {
							writer.writeLine(
								`validator(${JSON.stringify(target)}, (value) => standardParse(${schemaName}, value)),`,
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
): void {
	if (schemaNames.length === 0) {
		return;
	}

	honoFile.addImportDeclaration({
		moduleSpecifier: "./valibot.js",
		namedImports: schemaNames.toSorted(),
	});
}
