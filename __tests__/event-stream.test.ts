import type { oas32 } from "openapi3-ts";
import { describe, expect, test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";

function documentWith(
	itemSchema: oas32.SchemaObject | oas32.ReferenceObject | undefined,
	schemas: Record<string, oas32.SchemaObject> = {},
) {
	const document: oas32.OpenAPIObject = {
		openapi: "3.2.0",
		info: { title: "Test", version: "1.0.0" },
		components: { schemas },
		paths: {
			"/events": {
				get: {
					operationId: "streamEventsCommand",
					responses: {
						"200": {
							description: "OK",
							content: {
								"text/event-stream": itemSchema
									? { itemSchema }
									: { schema: { type: "string", format: "binary" } },
							},
						},
					},
				},
			},
		},
	};

	return document;
}

function jsonData(contentSchema: oas32.SchemaObject | oas32.ReferenceObject) {
	return {
		type: "string" as const,
		contentMediaType: "application/json",
		contentSchema,
	};
}

test("without an itemSchema, a plain command", async () => {
	const result = await processOpenApiDocument(
		"/tmp/whatever",
		documentWith(undefined),
	);

	expect(result.commandsFile.getText()).toMatchSnapshot("commands.ts");
	expect(result.commandsValidatedFile.getText()).toMatchSnapshot(
		"commands-validated.ts",
	);
	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.mainFile.getText()).toMatchSnapshot("main.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});

test("JSON data variants make the output a union", async () => {
	const result = await processOpenApiDocument(
		"/tmp/whatever",
		documentWith(
			{
				oneOf: [
					{
						type: "object",
						properties: {
							event: { const: "thing" },
							data: jsonData({ $ref: "#/components/schemas/Thing" }),
						},
					},
					{
						type: "object",
						properties: {
							event: { const: "heartbeat" },
							data: jsonData({
								type: "object",
								required: ["sequence"],
								properties: { sequence: { type: "integer" } },
								additionalProperties: false,
							}),
						},
					},
				],
			},
			{
				Thing: {
					type: "object",
					required: ["id"],
					properties: { id: { type: "string" } },
					additionalProperties: false,
				},
			},
		),
	);

	expect(result.commandsFile.getText()).toMatchSnapshot("commands.ts");
	expect(result.commandsValidatedFile.getText()).toMatchSnapshot(
		"commands-validated.ts",
	);
	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.mainFile.getText()).toMatchSnapshot("main.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});

test("data with no contentMediaType is text", async () => {
	const result = await processOpenApiDocument(
		"/tmp/whatever",
		documentWith({
			type: "object",
			properties: { data: { type: "string" } },
		}),
	);

	expect(result.commandsFile.getText()).toMatchSnapshot("commands.ts");
	expect(result.commandsValidatedFile.getText()).toMatchSnapshot(
		"commands-validated.ts",
	);
	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.mainFile.getText()).toMatchSnapshot("main.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});

describe("event-stream refusals", () => {
	test.each<[string, oas32.SchemaObject, RegExp]>([
		[
			"variants with different content media types",
			{
				oneOf: [
					{
						type: "object",
						properties: { data: jsonData({ type: "string" }) },
					},
					{ type: "object", properties: { data: { type: "string" } } },
				],
			},
			/streamEventsCommand: item content media types application\/json, text\/plain need one decoding/,
		],
		[
			"a variant with no data property",
			{
				type: "object",
				properties: { data: jsonData({ type: "string" }) },
				oneOf: [
					{ type: "object", properties: { event: { const: "a" } } },
					{ type: "object", properties: { event: { const: "b" } } },
				],
			},
			/streamEventsCommand: each itemSchema variant needs its own data schema/,
		],
		[
			"an allOf item",
			{
				allOf: [
					{
						type: "object",
						properties: { data: jsonData({ type: "string" }) },
					},
				],
			},
			/streamEventsCommand: each itemSchema variant needs its own data schema/,
		],
		[
			"JSON data with no contentSchema",
			{
				type: "object",
				properties: {
					data: { type: "string", contentMediaType: "application/json" },
				},
			},
			/streamEventsCommand: item content of application\/json needs a contentSchema/,
		],
	])("%s", async (_, itemSchema, message) => {
		await expect(
			processOpenApiDocument("/tmp/whatever", documentWith(itemSchema)),
		).rejects.toThrow(message);
	});
});

test("an itemSchema in a document older than OAS 3.2 is refused", async () => {
	const document = documentWith({
		type: "object",
		properties: { data: { type: "string" } },
	});

	await expect(
		processOpenApiDocument("/tmp/whatever", { ...document, openapi: "3.1.0" }),
	).rejects.toThrow(
		"streamEventsCommand: itemSchema is OAS 3.2, and the document declares openapi 3.1.0",
	);
});
