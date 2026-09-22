import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { build } from "../lib/build.ts";

const MANIFEST = ".openapi-codegen-manifest.json";

const document = {
	openapi: "3.1.0",
	info: { title: "Test", version: "1.0.0" },
	paths: {
		"/thing": {
			get: {
				operationId: "getThingCommand",
				responses: {
					"200": {
						description: "OK",
						content: { "application/json": { schema: { type: "string" } } },
					},
				},
			},
		},
	},
};

// Writes the document to disk, because `build` imports the input file
async function buildOnce() {
	const dir = await mkdtemp(path.join(tmpdir(), "codegen-manifest-"));
	const input = path.join(dir, "document.json");

	await writeFile(input, JSON.stringify(document));

	const outputDir = path.join(dir, "out");

	await build(input, outputDir);

	return { input, outputDir };
}

async function readManifest(outputDir: string) {
	const text = await readFile(path.join(outputDir, MANIFEST), "utf8");

	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse is typed any, and this reads back a manifest the build under test just wrote
	return JSON.parse(text) as Record<string, string>;
}

test("the manifest records the emitter revision", async () => {
	const { outputDir } = await buildOnce();
	const manifest = await readManifest(outputDir);

	expect(manifest["#generator"]).toMatch(/^[0-9a-f]{32}$/u);
});

// A file keeps its contents when its recorded revision matches, so the
// emitter revision is what forces a rewrite
test("a matching emitter revision leaves an unchanged file alone", async () => {
	const { input, outputDir } = await buildOnce();
	const target = path.join(outputDir, "main.ts");

	await writeFile(target, "// edited by hand\n");
	await build(input, outputDir);

	await expect(readFile(target, "utf8")).resolves.toBe("// edited by hand\n");
});

// Guards a run that overlaps an edit, which stamps a manifest newer than
// the emitter and leaves mtime reporting the output as current
test("a stale emitter revision rewrites every file", async () => {
	const { input, outputDir } = await buildOnce();
	const target = path.join(outputDir, "main.ts");
	const manifestPath = path.join(outputDir, MANIFEST);
	const manifest = await readManifest(outputDir);

	await writeFile(target, "// edited by hand\n");
	await writeFile(
		manifestPath,
		// oxlint-disable-next-line block65/snake-case-wire-keys -- the manifest's own key, read back by this generator
		JSON.stringify({ ...manifest, "#generator": "0".repeat(32) }),
	);

	await build(input, outputDir);

	await expect(readFile(target, "utf8")).resolves.toContain("@generated");
});
