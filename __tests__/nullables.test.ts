import type { oas31 } from "openapi3-ts";
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

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
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

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
	expect(result.enumsFile.getText()).toMatchSnapshot("enums.ts");
});

test("3.0 nullable objects, arrays, strings and combinator members admit null", async () => {
	const result = await processOpenApiDocument("/tmp/like-you-know-whatever", {
		openapi: "3.0.3",
		info: { title: "Test", version: "1.0.0" },
		paths: {},
		components: {
			schemas: {
				Base: {
					type: "object",
					properties: { id: { type: "string" } },
				},
				Nullables: {
					type: "object",
					required: [
						"object",
						"array",
						"string",
						"stringEnum",
						"unionMember",
						"intersectionMember",
					],
					properties: {
						object: {
							type: "object",
							properties: { id: { type: "string" } },
							nullable: true,
						},
						array: { type: "array", items: { type: "string" }, nullable: true },
						string: { type: "string", nullable: true },
						stringEnum: { type: "string", enum: ["a", "b"], nullable: true },
						// one nullable member makes the union nullable, once
						unionMember: {
							nullable: true,
							oneOf: [
								{ type: "string", nullable: true },
								{ type: "array", items: { type: "string" } },
							],
						},
						// an intersection needs every member nullable to admit null
						intersectionMember: {
							allOf: [
								{ $ref: "#/components/schemas/Base" },
								{
									type: "object",
									properties: { name: { type: "string" } },
									nullable: true,
								},
							],
						},
					},
				},
			},
		},
	} as oas31.OpenAPIObject);

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
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

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
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

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
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

	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
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

	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
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

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
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

	expect(result.typesFile.getText()).toMatchSnapshot("types.ts");
	expect(result.commandsFile.getText()).toMatchSnapshot("commands.ts");
	expect(result.commandsValidatedFile.getText()).toMatchSnapshot(
		"commands-validated.ts",
	);
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
	expect(result.honoFile.getText()).toMatchSnapshot("hono.ts");
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

	expect(result.valibotFile.getText()).toMatchSnapshot("valibot.ts");
});
