import type { oas31 } from "openapi3-ts";
import { expect, test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";

const baseDoc = {
	openapi: "3.1.0" as const,
	info: { title: "Test", version: "1.0.0" },
	paths: {},
};

test("x-typescript-hint on top-level string schema", async () => {
	const schema: oas31.OpenAPIObject = {
		...baseDoc,
		components: {
			schemas: {
				EmbedUrl: {
					type: "string",
					"x-typescript-hint": "`https://embed.example.com/${string}`",
				},
			},
		},
	};

	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever",
		schema,
	);

	const typesText = result.typesFile.getText();

	expect(typesText).toContain(
		"export type EmbedUrl = `https://embed.example.com/${string}`;",
	);
	expect(typesText).not.toMatch(/export type EmbedUrl = string;/);
});

test("x-typescript-hint honored inside oneOf branches", async () => {
	const schema: oas31.OpenAPIObject = {
		...baseDoc,
		components: {
			schemas: {
				EventSource: {
					oneOf: [
						{ type: "string", enum: ["native"] },
						{ type: "string", "x-typescript-hint": "EmbedUrl" },
						{ type: "string", "x-typescript-hint": "SyndicatedUrl" },
					],
				},
			},
		},
	};

	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever",
		schema,
	);

	const typesText = result.typesFile.getText();

	expect(typesText).toMatch(
		/export type EventSource =\s*"native" \| EmbedUrl \| SyndicatedUrl;/,
	);
	expect(typesText).not.toMatch(/EventSource = "native" \| string/);
});

test("x-typescript-hint honored inside anyOf branches", async () => {
	const schema: oas31.OpenAPIObject = {
		...baseDoc,
		components: {
			schemas: {
				MaybeUrl: {
					anyOf: [
						{ type: "string", "x-typescript-hint": "AbsoluteUrl" },
						{ type: "string", "x-typescript-hint": "RelativeUrl" },
					],
				},
			},
		},
	};

	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever",
		schema,
	);

	expect(result.typesFile.getText()).toMatch(
		/export type MaybeUrl =\s*AbsoluteUrl \| RelativeUrl;/,
	);
});
