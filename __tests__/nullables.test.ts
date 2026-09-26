import type { oas31 } from "openapi3-ts";
import { test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";
import { expectGenerated } from "./generated-snapshot.ts";

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

	await expectGenerated([result.typesFile]);
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

	await expectGenerated([
		result.typesFile,
		result.valibotFile,
		result.enumsFile,
	]);
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
						// oxlint-disable-next-line unicorn/no-null -- the document under test declares a JSON null constant, which is the shape this exercises
						const: null,
					},
				},
			},
		},
		[],
	);

	await expectGenerated([result.typesFile, result.valibotFile]);
});

test("RFC 3339 temporal formats", async () => {
	const result = await processOpenApiDocument("/tmp/like-you-know-whatever", {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {},
		components: {
			schemas: {
				MyDate: { type: "string", format: "date" },
				MyTime: { type: "string", format: "time" },
				MyDateTime: { type: "string", format: "date-time" },
				MyDuration: { type: "string", format: "duration" },
			},
		},
	});

	await expectGenerated([result.typesFile, result.valibotFile]);
});

test("enums short-circuit type constraints (picklist only)", async () => {
	const result = await processOpenApiDocument("/tmp/like-you-know-whatever", {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {},
		components: {
			schemas: {
				// integer enum with a range constraint, which skips minValue and integer
				IntegerEnum: {
					type: "integer",
					enum: [0, 1, 2],
					minimum: 0,
					maximum: 9,
				},
				// string enum with minLength and format, which skips minLength and regex
				StringEnum: {
					type: "string",
					format: "email",
					enum: ["a@example.com", "b@example.com"],
					minLength: 1,
				},
			},
		},
	});

	await expectGenerated([result.valibotFile]);
});

test("oneOf with type null generates v.null()", async () => {
	const result = await processOpenApiDocument("/tmp/like-you-know-whatever", {
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
	});

	await expectGenerated([result.valibotFile]);
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

	await expectGenerated([result.typesFile, result.valibotFile]);
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
								enum: ["application/json", "text/csv", "application/xml"],
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

	await expectGenerated([
		result.typesFile,
		result.commandsFile,
		result.commandsValidatedFile,
		result.valibotFile,
		result.honoFile,
	]);
});

test("input-only mode omits wire schemas", async () => {
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
		{ inputOnly: true },
	);

	await expectGenerated([result.valibotFile]);
});
