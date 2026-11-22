import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { toJsonSchema } from "@valibot/to-json-schema";
import type { oas32 } from "openapi3-ts";
import * as v from "valibot";
import { expect, test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";

const document: oas32.OpenAPIObject = {
	openapi: "3.2.0",
	info: { title: "Test", version: "1.0.0" },
	paths: {
		"/things": {
			get: {
				operationId: "listThingsCommand",
				parameters: [
					{
						name: "after",
						in: "query",
						schema: { type: "integer", format: "int64", minimum: 0 },
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 100 },
					},
					{
						name: "offset",
						in: "query",
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "OK",
						content: { "application/json": { schema: { type: "string" } } },
					},
				},
			},
		},
	},
	components: {
		schemas: {
			Price: { type: "integer", format: "int64", minimum: 0 },
			Percent: { type: "integer", format: "int64", minimum: 0, maximum: 100 },
			Delta: { type: "integer", format: "int64" },
		},
	},
};

// Writes the generated validators where `valibot` resolves, then loads them
async function loadValidators() {
	const outputDir = path.join(
		import.meta.dirname,
		".generated",
		"integer-strings",
	);
	const result = await processOpenApiDocument(outputDir, document);

	await mkdir(outputDir, { recursive: true });
	await Promise.all(
		[result.valibotFile, result.typesFile].map((file) =>
			writeFile(file.getFilePath(), file.getFullText()),
		),
	);

	const validators: Record<string, v.GenericSchema> = await import(
		result.valibotFile.getFilePath()
	);

	return { text: result.valibotFile.getText(), validators };
}

const { text, validators } = await loadValidators();

function validator(name: string) {
	const schema = validators[name];
	if (!schema) {
		throw new Error(`no ${name} in the generated validators`);
	}
	return schema;
}

// Input mode stops at a transform, and converts the bigint member to `{}`
function wireJsonSchema(schema: v.GenericSchema) {
	return toJsonSchema(schema, { errorMode: "ignore", typeMode: "input" });
}

test("an int64 string admits only the integers its minimum allows", () => {
	expect(text).toContain(
		"export const priceSchema = v.union([v.pipe(v.string(), v.digits(), v.toBigint(), v.pipe(v.bigint(), v.minValue(0n))), v.pipe(v.number(), v.integer(), v.minValue(0), v.toBigint(), v.pipe(v.bigint(), v.minValue(0n))), v.pipe(v.bigint(), v.minValue(0n))]);",
	);
	expect(text).toContain(
		String.raw`export const deltaSchema = v.union([v.pipe(v.string(), v.regex(/^-?\d+$/u), v.toBigint(), v.bigint()), v.pipe(v.number(), v.integer(), v.toBigint(), v.bigint()), v.bigint()]);`,
	);
});

test("an int64 wire schema converts to an honest JSON Schema", () => {
	expect(wireJsonSchema(validator("priceSchema")).anyOf).toEqual(
		expect.arrayContaining([
			{ type: "string", pattern: String.raw`^\d+$` },
			{ type: "integer", minimum: 0 },
		]),
	);
	expect(wireJsonSchema(validator("percentSchema")).anyOf).toEqual(
		expect.arrayContaining([
			{ type: "string", pattern: String.raw`^\d+$` },
			{ type: "integer", minimum: 0, maximum: 100 },
		]),
	);
	expect(wireJsonSchema(validator("deltaSchema")).anyOf).toEqual(
		expect.arrayContaining([
			{ type: "string", pattern: String.raw`^-?\d+$` },
			{ type: "integer" },
		]),
	);
});

test("an int64 wire schema still checks its bounds", () => {
	const price = validator("priceSchema");
	const percent = validator("percentSchema");
	const delta = validator("deltaSchema");

	expect(v.safeParse(price, "12")).toMatchObject({ output: 12n });
	expect(v.safeParse(price, 12)).toMatchObject({ output: 12n });
	expect(v.safeParse(delta, "-5")).toMatchObject({ output: -5n });
	expect(v.safeParse(delta, "9007199254740993")).toMatchObject({
		output: 9_007_199_254_740_993n,
	});

	for (const value of ["-5", "1.5", "+5", "", -5]) {
		expect(v.safeParse(price, value).success).toBe(false);
	}

	expect(v.safeParse(percent, "101").success).toBe(false);
	expect(v.safeParse(percent, 101).success).toBe(false);
	expect(v.safeParse(delta, "1.5").success).toBe(false);
});

test("an integer query string admits only the integers its minimum allows", () => {
	const query = validator("listThingsCommandQuerySchema");

	expect(wireJsonSchema(query)).toMatchObject({
		properties: {
			after: {
				anyOf: expect.arrayContaining([
					{ type: "string", pattern: String.raw`^\d+$` },
					{ type: "integer", minimum: 0 },
				]),
			},
			limit: {
				anyOf: [
					{ type: "string", pattern: String.raw`^\d+$` },
					{ type: "integer", minimum: 1, maximum: 100 },
				],
			},
			offset: {
				anyOf: [
					{ type: "string", pattern: String.raw`^-?\d+$` },
					{ type: "integer" },
				],
			},
		},
	});

	expect(
		v.safeParse(query, { after: "7", limit: "5", offset: "-2" }),
	).toMatchObject({ output: { after: 7n, limit: 5, offset: -2 } });
	expect(v.safeParse(query, { limit: "2.5" }).success).toBe(false);
	expect(v.safeParse(query, { limit: "0" }).success).toBe(false);
});
