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

	expect(result.typesFile.getText()).toMatchSnapshot("types");
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

	expect(result.typesFile.getText()).toMatchSnapshot("types");
	expect(result.valibotFile?.getText()).toMatchSnapshot("valibot");
	expect(result.enumsFile.getText()).toMatchSnapshot("enums");
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

	expect(result.typesFile.getText()).toMatchSnapshot("types");
	expect(result.valibotFile?.getText()).toMatchSnapshot("valibot");
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

	const types = result.typesFile.getText();

	// Template-literal string types capture the digit shape for every format
	expect(types).toContain(
		"export type MyDate = `${number}-${number}-${number}`",
	);
	expect(types).toContain(
		"export type MyTime = `${number}:${number}:${number}${string}`",
	);
	expect(types).toContain(
		"export type MyDateTime = `${number}-${number}-${number}T${number}:${number}:${number}${string}`",
	);
	expect(types).toContain("export type MyDuration = `P${string}`");

	const valibot = result.valibotFile.getText();

	// Each format gets a runtime regex plus a v.custom<...> type hint, in both
	// the input and wire schema (8 of each across the four formats)
	expect(valibot.match(/v\.regex\(/g)?.length).toBe(8);
	expect(valibot.match(/v\.custom</g)?.length).toBe(8);

	// The hint type matches the generated TS type (date shown)
	expect(valibot).toContain(
		"v.custom<`${number}-${number}-${number}`>(() => true)",
	);
});

test("enums short-circuit type constraints (picklist only)", async () => {
	const result = await processOpenApiDocument("/tmp/like-you-know-whatever", {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {},
		components: {
			schemas: {
				// integer enum with a range constraint: must NOT emit minValue/integer
				IntegerEnum: {
					type: "integer",
					enum: [0, 1, 2],
					minimum: 0,
					maximum: 9,
				},
				// string enum carrying minLength/format: must NOT emit minLength/regex
				StringEnum: {
					type: "string",
					format: "email",
					enum: ["a@example.com", "b@example.com"],
					minLength: 1,
				},
			},
		},
	});

	const valibot = result.valibotFile.getText();
	expect(valibot).toContain(
		"export const inputIntegerEnumSchema = v.picklist([0, 1, 2])",
	);
	expect(valibot).toContain(
		'export const inputStringEnumSchema = v.picklist(["a@example.com", "b@example.com"])',
	);

	// No leftover type-specific constraints leaked onto the enums
	expect(valibot).not.toContain("v.minValue");
	expect(valibot).not.toContain("v.minLength");
	expect(valibot).not.toContain("v.email");
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

	expect(result.valibotFile.getText()).toMatchSnapshot("valibot");
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

	expect(result.typesFile.getText()).toMatchSnapshot("types");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot");
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

	expect(result.typesFile.getText()).toMatchSnapshot("types");
	expect(result.commandsFile.getText()).toMatchSnapshot("commands");
	expect(result.commandsValidatedFile.getText()).toMatchSnapshot("commands-validated");
	expect(result.valibotFile.getText()).toMatchSnapshot("valibot");
	expect(result.honoFile.getText()).toMatchSnapshot("hono");
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

	const valibotText = result.valibotFile.getText();

	expect(valibotText).toContain("inputNameSchema");
	expect(valibotText).toContain("inputAmountSchema");
	expect(valibotText).not.toMatch(/export const nameSchema\b/);
	expect(valibotText).not.toMatch(/export const amountSchema\b/);
	expect(valibotText).not.toContain("v.trim()");
	expect(valibotText).not.toContain("v.toNumber()");
	expect(valibotText).not.toContain("v.toBigint()");
	expect(valibotText).not.toMatch(/export const listItemsCommandQuerySchema\b/);
});
