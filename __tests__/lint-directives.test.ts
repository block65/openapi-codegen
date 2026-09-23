import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { assert, expect, test } from "vitest";
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

const withHeader = {
	...document,
	paths: {
		"/thing": {
			get: {
				...document.paths["/thing"].get,
				parameters: [
					{ name: "x-request-id", in: "header", schema: { type: "string" } },
				],
			},
		},
	},
};

async function buildIn(parent: string, source: object = document) {
	const dir = await mkdtemp(path.join(parent, "lint-directives-"));
	const input = path.join(dir, "document.json");

	await writeFile(input, JSON.stringify(source));
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

async function strictObjectErrors(dir: string) {
	const oxlint = path.join(
		import.meta.dirname,
		"..",
		"node_modules",
		".bin",
		"oxlint",
	);
	const stdout = await promisify(execFile)(oxlint, ["--format=json", dir]).then(
		(result) => result.stdout,
		(error: unknown) =>
			typeof error === "object" && error !== null && "stdout" in error
				? String(error.stdout)
				: "",
	);
	const report: unknown = JSON.parse(stdout);

	assert(
		typeof report === "object" &&
			report !== null &&
			"diagnostics" in report &&
			Array.isArray(report.diagnostics),
	);

	return report.diagnostics.filter(
		(diagnostic: unknown) =>
			typeof diagnostic === "object" &&
			diagnostic !== null &&
			"code" in diagnostic &&
			diagnostic.code === "block65(prefer-strict-object)",
	).length;
}

// Stripping undeclared headers is the point of a header schema, so only the
// open body object reaches the consumer's lint
test("a header schema is bracketed and an open body object still errors", async () => {
	const { dir, valibot } = await buildIn(import.meta.dirname, withHeader);
	const errors = await strictObjectErrors(dir);

	await rm(dir, { recursive: true });

	expect(valibot).toMatch(
		/^\/\/ oxlint-disable block65\/prefer-strict-object -- a request carries headers .*\nexport const inputGetThingCommandHeaderSchema = /mu,
	);
	expect(valibot).toMatch(
		/^\/\/ oxlint-disable block65\/prefer-strict-object -- .*\nexport const getThingCommandHeaderSchema = /mu,
	);

	// input and wire variants of the open `Thing`
	expect(errors).toBe(2);
});

// An upgrade from 12, or a changed lint config, leaves a file its manifest
// records as current without the directives it now needs
test("a regeneration writes directives the recorded files lack", async () => {
	const { dir } = await buildIn(import.meta.dirname);
	const manifestPath = path.join(dir, ".openapi-codegen-manifest.json");
	const manifestText = await readFile(manifestPath, "utf8");
	const manifest: unknown = JSON.parse(manifestText);

	assert(typeof manifest === "object" && manifest !== null);

	const entries = await readdir(dir);
	const names = entries.filter((name) => name.endsWith(".ts"));
	const revisions = await Promise.all(
		names.map(async (name) => {
			const text = await readFile(path.join(dir, name), "utf8");
			const bare = text.replace(/^\/\/ oxlint-disable .*\n\n/mu, "");

			await writeFile(path.join(dir, name), bare);

			return [
				name,
				createHash("sha256").update(bare).digest("hex").slice(0, 32),
			];
		}),
	);

	await writeFile(
		manifestPath,
		JSON.stringify({ ...manifest, ...Object.fromEntries(revisions) }),
	);
	await build(path.join(dir, "document.json"), dir);

	const valibot = await readFile(path.join(dir, "valibot.ts"), "utf8");

	await rm(dir, { recursive: true });

	expect(valibot).toContain(
		"// oxlint-disable block65/prefer-exact-optional\n",
	);
});

// Plugin 0.11.0 deleted the rule, so a directive naming it would be dead
test("no fixture directive names snake-case-wire-keys", async () => {
	const fixtures = path.join(import.meta.dirname, "fixtures");
	const entries = await readdir(fixtures, { recursive: true });
	const modules = entries.filter((entry) => entry.endsWith(".ts"));
	const directives = await Promise.all(
		modules.map(async (entry) => {
			const text = await readFile(path.join(fixtures, entry), "utf8");

			const directive = text.match(/^\/\/ oxlint-disable .*$/mu);

			return directive ? [directive[0]] : [];
		}),
	).then((found) => found.flat());

	expect(directives).not.toHaveLength(0);
	expect(directives.join("\n")).not.toContain("snake-case-wire-keys");
});

test("output outside any oxlint project gets no directive", async () => {
	const { dir, valibot } = await buildIn(tmpdir());

	await rm(dir, { recursive: true });

	expect(valibot).not.toContain("oxlint-disable");
});
