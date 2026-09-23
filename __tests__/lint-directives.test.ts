import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { build } from "../lib/build.ts";

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
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Thing" },
							},
						},
					},
				},
			},
		},
	},
	components: {
		schemas: {
			Thing: {
				type: "object",
				properties: { name: { type: "string" } },
			},
		},
	},
};

async function buildIn(parent: string) {
	const dir = await mkdtemp(path.join(parent, "lint-directives-"));
	const input = path.join(dir, "document.json");

	await writeFile(input, JSON.stringify(document));
	await build(input, dir);

	return {
		dir,
		valibot: await readFile(path.join(dir, "valibot.ts"), "utf8"),
		main: await readFile(path.join(dir, "main.ts"), "utf8"),
	};
}

// Output inside this repository finds its oxlint
test("a file names the exempt rules that fire in it", async () => {
	const { dir, valibot, main } = await buildIn(import.meta.dirname);

	await rm(dir, { recursive: true });

	expect(valibot).toContain(
		"// oxlint-disable block65/prefer-exact-optional\n",
	);
	expect(main).not.toContain("oxlint-disable");
});

// An open object can let a peer's unnamed keys through, so its error reaches
// the consumer
test("an open object schema stays a lint error", async () => {
	const { dir, valibot } = await buildIn(import.meta.dirname);

	await rm(dir, { recursive: true });

	expect(valibot).toContain("v.looseObject(");
	expect(valibot).not.toContain("prefer-strict-object");
});

test("output outside any oxlint project gets no directive", async () => {
	const { dir, valibot } = await buildIn(tmpdir());

	await rm(dir, { recursive: true });

	expect(valibot).not.toContain("oxlint-disable");
});
