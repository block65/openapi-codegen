import type { oas32 } from "openapi3-ts";
import { expect, test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";

function generateSchemas(schemas: Record<string, oas32.SchemaObject>) {
	return processOpenApiDocument("/tmp/refs", {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {},
		components: { schemas },
	});
}

test("a $ref inside example data is not a dependency", async () => {
	const result = await generateSchemas({
		Parent: {
			type: "object",
			properties: { child: { $ref: "#/components/schemas/Child" } },
		},
		Child: {
			type: "object",
			properties: { name: { type: "string" } },
			example: { $ref: "#/components/schemas/Parent" },
			default: { $ref: "#/components/schemas/Parent" },
		},
	});

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});

test("a property named after a keyword still orders by its $ref", async () => {
	const result = await generateSchemas({
		Settings: {
			type: "object",
			properties: {
				default: { $ref: "#/components/schemas/Preset" },
				example: { $ref: "#/components/schemas/Preset" },
			},
		},
		Preset: { type: "string", enum: ["low", "high"] },
	});

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});
