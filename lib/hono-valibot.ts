import { join } from "node:path";
import camelcase from "camelcase";
import type { Project, SourceFile } from "ts-morph";
import { VariableDeclarationKind } from "ts-morph";

export function createHonoValibotFile(
	project: Project,
	outputDir: string,
): SourceFile {
	const file = project.createSourceFile(
		join(outputDir, "hono-valibot.ts"),
		"",
		{ overwrite: true },
	);

	file.addImportDeclaration({
		moduleSpecifier: "hono/validator",
		namedImports: ["validator"],
	});

	file.addImportDeclaration({
		moduleSpecifier: "valibot",
		namespaceImport: "v",
	});

	file.addImportDeclaration({
		moduleSpecifier: "@block65/rest-client",
		namedImports: ["PublicValibotHonoError"],
	});

	file.addFunction({
		name: "toPublicValibotHonoError",
		parameters: [{ name: "err", type: "unknown" }],
		returnType: "never",
		statements: `
      if (err instanceof v.ValiError) {
        throw PublicValibotHonoError.from(err);
      }
      throw err;
    `,
	});

	return file;
}

export function createHonoValibotMiddleware(
	honoValibotFile: SourceFile,
	exportName: string,
	schemas: { json?: string; param?: string; query?: string; header?: string },
): void {
	honoValibotFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: camelcase(exportName),
				initializer: (writer) => {
					writer.write("[");
					writer.indent(() => {
						for (const [target, schemaName] of Object.entries(schemas).filter(
							([t]) => t !== "header",
						)) {
							writer.writeLine(
								`validator(${JSON.stringify(target)}, (value) => {`,
							);
							writer.indent(() => {
								writer.writeLine(
									`return v.parseAsync(${schemaName}, value).catch(toPublicValibotHonoError);`,
								);
							});
							writer.writeLine("}),");
						}
					});
					writer.write("] as const");
				},
			},
		],
	});
}

export function addValibotImportsToHonoValibotFile(
	honoValibotFile: SourceFile,
	schemaNames: string[],
): void {
	if (schemaNames.length === 0) {
		return;
	}

	honoValibotFile.addImportDeclaration({
		moduleSpecifier: "./valibot.js",
		namedImports: schemaNames.toSorted(),
	});
}
