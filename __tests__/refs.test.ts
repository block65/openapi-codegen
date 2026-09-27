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

test("a $ref to an undefined schema names the schema and the ref", async () => {
	await expect(
		generateSchemas({
			Order: {
				type: "object",
				properties: { customer: { $ref: "#/components/schemas/Customer" } },
			},
		}),
	).rejects.toThrow(
		"Order refers to #/components/schemas/Customer, which is not a schema in components.schemas",
	);
});

test("a schema name with a slash or tilde is found through its escaped $ref", async () => {
	const result = await generateSchemas({
		"pet/kind": { type: "string", enum: ["cat", "dog"] },
		"pet~tag": { type: "string" },
		Pet: {
			type: "object",
			properties: {
				kind: { $ref: "#/components/schemas/pet~1kind" },
				tag: { $ref: "#/components/schemas/pet~0tag" },
			},
		},
	});

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});

test("a percent-encoded $ref finds its schema", async () => {
	const result = await generateSchemas({
		"Pet Kind": { type: "string", enum: ["cat", "dog"] },
		Pet: {
			type: "object",
			properties: { kind: { $ref: "#/components/schemas/Pet%20Kind" } },
		},
	});

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});

test("a $ref into part of a schema inlines that subschema", async () => {
	const result = await generateSchemas({
		Address: {
			type: "object",
			$defs: { Postcode: { type: "string", pattern: "^[0-9]{4}$" } },
			properties: {
				postcode: { $ref: "#/components/schemas/Address/$defs/Postcode" },
			},
		},
		Parcel: {
			type: "object",
			properties: {
				to: {
					$ref: "#/components/schemas/Address/properties/postcode",
					description: "Where the parcel goes",
				},
			},
		},
	});

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});

test("a $ref into its own schema is refused", async () => {
	await expect(
		generateSchemas({
			Folder: {
				type: "object",
				properties: {
					parent: { $ref: "#/components/schemas/Folder/properties/parent" },
				},
			},
		}),
	).rejects.toThrow(
		"#/components/schemas/Folder/properties/parent refers into itself, so it cannot be inlined",
	);
});

test("a $ref into a part a schema lacks is refused", async () => {
	await expect(
		generateSchemas({
			Address: { type: "object", properties: { street: { type: "string" } } },
			Parcel: {
				type: "object",
				properties: {
					to: { $ref: "#/components/schemas/Address/properties/postcode" },
				},
			},
		}),
	).rejects.toThrow(
		"#/components/schemas/Address/properties/postcode does not point at a schema in the document",
	);
});
