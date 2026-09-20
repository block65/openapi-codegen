import path from "node:path";
import camelcase from "camelcase";
import type { ParameterStyle } from "openapi3-ts/oas32";
import type { Project, SourceFile } from "ts-morph";
import { VariableDeclarationKind } from "ts-morph";
import { typedEntries } from "./utils.ts";

// OAS 3.2 §4.12.6 defines these four styles for a query parameter. `satisfies`
// ties the keys to openapi3-ts, so a style it renames or drops fails here
export const queryStyles = {
	form: true,
	spaceDelimited: true,
	pipeDelimited: true,
	deepObject: true,
} as const satisfies Partial<Record<ParameterStyle, true>>;

export type QueryParamSpec = {
	readonly name: string;
	readonly type: "object" | "array";
	readonly style: keyof typeof queryStyles;
	readonly explode: boolean;
	readonly members?: readonly string[];
};

export function createHonoFile(
	project: Project,
	outputDir: string,
): SourceFile {
	const file = project.createSourceFile(path.join(outputDir, "hono.ts"), "", {
		overwrite: true,
	});

	// fixUnusedIdentifiers prunes these three from a document that validates
	// nothing
	file.addImportDeclaration({
		moduleSpecifier: "@hono/standard-validator",
		namedImports: ["sValidator"],
	});

	file.addImportDeclaration({
		moduleSpecifier: "hono",
		namedImports: ["ValidationTargets"],
		isTypeOnly: true,
	});

	file.addImportDeclaration({
		moduleSpecifier: "@block65/rest-client",
		namedImports: ["PublicValidationError"],
	});

	// sValidator's own parameter names the schema constraint, which keeps
	// @standard-schema/spec out of the imports for a type erased at runtime
	file.addTypeAlias({
		name: "StandardSchema",
		type: "Parameters<typeof sValidator>[1]",
	});

	// sValidator returns a 400 JSON body on a failed validation. The hook throws
	// first, so a caller's error handler keeps seeing PublicValidationError
	file.addFunction({
		name: "validate",
		typeParameters: [
			{ name: "TSchema", constraint: "StandardSchema" },
			{ name: "TTarget", constraint: "keyof ValidationTargets" },
		],
		parameters: [
			{ name: "target", type: "TTarget" },
			{ name: "schema", type: "TSchema" },
		],
		statements: `
      return sValidator(target, schema, (result) => {
        if (!result.success) {
          throw PublicValidationError.fromIssues(result.error);
        }
      });
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

	// Decoding a query parameter past a plain scalar belongs to the consumer.
	// A validator is handed the query hono parsed, and that parser is fixed.
	// Exporting the spec gives them the style and members from the document
	if (schemas.query && queryParams.length > 0) {
		honoFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name: `${name}QueryParams`,
					initializer: `${JSON.stringify(queryParams)} as const`,
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
							writer.writeLine(
								`validate(${JSON.stringify(target)}, ${schemaName}),`,
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
