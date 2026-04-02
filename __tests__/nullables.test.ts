import { expect, test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";

test("nullables", async () => {
	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever", // if we dont call .save() it doesnt matter what this path is
		{
			openapi: "3.1.0",
			info: {
				title: "Test",
				version: "1.0.0",
			},
			paths: {},
			components: {
				schemas: {
					MySchemaLolOrNullable: {
						oneOf: [
							{
								type: ["string", "null"],
								enum: ["lol", "kek"],
							},
						],
					},
				},
			},
		},
		[],
	);

	expect(result.typesFile.getText()).toMatchSnapshot();
});

test("top-level type array with null", async () => {
	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever",
		{
			openapi: "3.1.0",
			info: {
				title: "Test",
				version: "1.0.0",
			},
			paths: {},
			components: {
				schemas: {
					NullableString: {
						type: ["string", "null"],
					},
					NullableStringEnum: {
						type: ["string", "null"],
						enum: ["active", "inactive"],
					},
					NullableInteger: {
						type: ["integer", "null"],
					},
					MultiType: {
						type: ["string", "number"],
					},
				},
			},
		},
		[],
	);

	expect(result.typesFile.getText()).toMatchSnapshot();
	expect(result.valibotFile?.getText()).toMatchSnapshot();
	expect(result.enumsFile.getText()).toMatchSnapshot();
});

test("const values", async () => {
	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever",
		{
			openapi: "3.1.0",
			info: {
				title: "Test",
				version: "1.0.0",
			},
			paths: {},
			components: {
				schemas: {
					StringConst: {
						type: "string",
						const: "hello",
					},
					NumberConst: {
						type: "integer",
						const: 42,
					},
					BooleanConst: {
						const: true,
					},
					NullConst: {
						const: null,
					},
				},
			},
		},
		[],
	);

	expect(result.typesFile.getText()).toMatchSnapshot();
	expect(result.valibotFile?.getText()).toMatchSnapshot();
});
