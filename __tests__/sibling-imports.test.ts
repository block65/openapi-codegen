import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Project } from "ts-morph";
import { expect, test } from "vitest";
import { build } from "../lib/build.ts";

// Lists the relative specifiers in the files `build` writes for a fixture
async function relativeSpecifiers(documentName: string) {
	const outputDir = await mkdtemp(path.join(tmpdir(), "codegen-imports-"));

	await build(
		path.join(import.meta.dirname, "fixtures", `${documentName}.json`),
		outputDir,
	);

	const project = new Project();
	const files = project.addSourceFilesAtPaths(path.join(outputDir, "*.ts"));

	const declarations = files.flatMap((file) => [
		...file.getImportDeclarations(),
		...file.getExportDeclarations(),
	]);

	return {
		specifiers: declarations
			.map((decl) => decl.getModuleSpecifierValue())
			.filter(
				(specifier): specifier is string => specifier?.startsWith(".") === true,
			),
		siblings: files.map((file) => `./${file.getBaseName()}`),
	};
}

test.each(["petstore", "test1", "docker"])(
	"%s imports its sibling files by their .ts names",
	async (documentName) => {
		const { specifiers, siblings } = await relativeSpecifiers(documentName);

		expect(specifiers.length).toBeGreaterThan(0);
		expect(specifiers.filter((s) => s.endsWith(".js"))).toStrictEqual([]);
		expect(specifiers.filter((s) => !siblings.includes(s))).toStrictEqual([]);
	},
);
