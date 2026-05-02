import { expect, test } from "vitest";
import type { oas31 } from "openapi3-ts";
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

test("oneOf with type null generates v.null()", async () => {
	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever",
		{
			openapi: "3.1.0",
			info: { title: "Test", version: "1.0.0" },
			paths: {},
			components: {
				schemas: {
					NullableImage: {
						oneOf: [{ type: "string", format: "uri" }, { type: "null" }],
					},
				},
			},
		},
	);

	expect(result.valibotFile.getText()).toMatchSnapshot();
});

test("query and header integer params coerce strings to numbers", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: {
			title: "Test",
			version: "1.0.0",
		},
		components: {
			schemas: {
				Dummy: { type: "string" },
				ExpireTime: {
					type: "integer",
					format: "int64",
					minimum: 0,
				},
			},
		},
		paths: {
			"/files": {
				get: {
					operationId: "listFilesCommand",
					parameters: [
						{
							name: "exp",
							in: "query",
							required: true,
							schema: {
								$ref: "#/components/schemas/ExpireTime",
							},
						},
						{
							name: "limit",
							in: "query",
							required: false,
							schema: {
								type: "integer",
								minimum: 1,
								maximum: 100,
							},
						},
						{
							name: "X-Rate-Limit",
							in: "header",
							required: true,
							schema: {
								type: "integer",
								minimum: 0,
							},
						},
					],
					responses: {
						"200": {
							description: "OK",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/Dummy",
									},
								},
							},
						},
					},
				},
			},
		},
	};

	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever",
		schema,
	);

	expect(result.typesFile.getText()).toMatchSnapshot();
	expect(result.valibotFile.getText()).toMatchSnapshot();
});

test("header parameters", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: {
			title: "Test",
			version: "1.0.0",
		},
		components: {
			schemas: {
				UploadStatus: {
					type: "string",
					enum: ["pending", "complete"],
				},
			},
		},
		paths: {
			"/uploads/{uploadId}": {
				post: {
					operationId: "uploadDataCommand",
					parameters: [
						{
							name: "uploadId",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
						{
							name: "Content-Type",
							in: "header",
							required: true,
							schema: {
								type: "string",
								enum: [
									"application/json",
									"text/csv",
									"application/xml",
								],
							},
						},
						{
							name: "Content-Length",
							in: "header",
							required: true,
							schema: {
								type: "integer",
								format: "int64",
							},
						},
						{
							name: "X-Idempotency-Key",
							in: "header",
							required: false,
							schema: {
								type: "string",
								format: "uuid",
							},
						},
					],
					responses: {
						"200": {
							description: "OK",
							content: {
								"application/json": {
									schema: {
										$ref: "#/components/schemas/UploadStatus",
									},
								},
							},
						},
					},
				},
			},
		},
	};

	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever",
		schema,
	);

	expect(result.typesFile.getText()).toMatchSnapshot();
	expect(result.commandsFile.getText()).toMatchSnapshot();
	expect(result.valibotFile.getText()).toMatchSnapshot();
	expect(result.honoValibotFile.getText()).toMatchSnapshot();
});

test("exact-only mode omits coerced schemas", async () => {
	const result = await processOpenApiDocument(
		"/tmp/like-you-know-whatever",
		{
			openapi: "3.1.0",
			info: { title: "Test", version: "1.0.0" },
			components: {
				schemas: {
					Name: {
						type: "string",
						minLength: 1,
					},
					Amount: {
						type: "integer",
						format: "int64",
						minimum: 0,
					},
				},
			},
			paths: {
				"/items": {
					get: {
						operationId: "listItemsCommand",
						parameters: [
							{
								name: "limit",
								in: "query",
								required: false,
								schema: { type: "integer", minimum: 1 },
							},
						],
						responses: {
							"200": {
								description: "OK",
								content: {
									"application/json": {
										schema: { $ref: "#/components/schemas/Name" },
									},
								},
							},
						},
					},
				},
			},
		},
		[],
		{ exactOnly: true },
	);

	const valibotText = result.valibotFile.getText();

	expect(valibotText).toContain("exactNameSchema");
	expect(valibotText).toContain("exactAmountSchema");
	expect(valibotText).not.toMatch(/export const nameSchema\b/);
	expect(valibotText).not.toMatch(/export const amountSchema\b/);
	expect(valibotText).not.toContain("v.trim()");
	expect(valibotText).not.toContain("v.toNumber()");
	expect(valibotText).not.toContain("v.toBigint()");
	expect(valibotText).not.toMatch(/export const listItemsCommandQuerySchema\b/);
});
