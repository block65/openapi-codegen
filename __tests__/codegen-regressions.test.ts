import type { oas31 } from "openapi3-ts";
import { test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";
import { expectGenerated } from "./generated-snapshot.ts";

const respOk = {
	"200": {
		description: "OK",
		content: { "application/json": { schema: { type: "string" } } },
	},
} as const;

test("main.ts emits file-level `import type` for type-only imports", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/one": {
				post: {
					operationId: "oneCommand",
					requestBody: {
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: { x: { type: "string" } },
								},
							},
						},
					},
					responses: respOk,
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	await expectGenerated([result.mainFile]);
});

test("optional query params do not carry `| undefined` in their property type", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/files": {
				get: {
					operationId: "listFilesCommand",
					parameters: [
						{
							name: "purpose",
							in: "query",
							required: false,
							schema: { type: "string" },
						},
						{
							name: "limit",
							in: "query",
							required: false,
							schema: { type: "integer", minimum: 1, maximum: 100 },
						},
					],
					responses: respOk,
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	await expectGenerated([result.typesFile]);
});

test("AllInputs union carries every command that takes an input", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/with-body": {
				post: {
					operationId: "withBodyCommand",
					requestBody: {
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: { x: { type: "string" } },
								},
							},
						},
					},
					responses: respOk,
				},
			},
			"/empty-a": {
				get: { operationId: "alphaCommand", responses: respOk },
			},
			"/empty-b": {
				get: { operationId: "betaCommand", responses: respOk },
			},
			"/empty-c": {
				get: { operationId: "gammaCommand", responses: respOk },
			},
			"/with-query": {
				get: {
					operationId: "withQueryCommand",
					parameters: [
						{
							name: "q",
							in: "query",
							required: false,
							schema: { type: "string" },
						},
					],
					responses: respOk,
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	await expectGenerated([result.mainFile]);
});

// An empty schema permits any value, so the keys outside `properties` are
// unconstrained and the object is loose
test.for([
	["empty schema", {}],
	["string schema", { type: "string" }],
	["false", false],
	["true", true],
] as const)(
	"additionalProperties chooses the object schema: %s",
	async ([, additionalProperties]) => {
		const result = await processOpenApiDocument(
			"/tmp/additional-properties",
			docWithSchema("Open", {
				type: "object",
				properties: { a: { type: "string" } },
				additionalProperties,
			}),
		);

		await expectGenerated([result.valibotFile]);
	},
);

// A one-member `anyOf` or `oneOf` is that member. `v.union` of one option
// only wraps its issues, and the block65 valibot rules reject it
test.for<[string, oas31.SchemaObject]>([
	["anyOf", { anyOf: [{ type: "string" }] }],
	["oneOf", { oneOf: [{ type: "string" }] }],
	["two-member oneOf", { oneOf: [{ type: "string" }, { type: "number" }] }],
])(
	"a single-member combinator emits the member alone: %s",
	async ([, schema]) => {
		const result = await processOpenApiDocument(
			"/tmp/single-member-combinator",
			docWithSchema("Only", schema),
		);

		await expectGenerated([result.valibotFile]);
	},
);

function docWithSchema(name: string, schema: oas31.SchemaObject) {
	return {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		components: { schemas: { [name]: schema } },
		paths: {
			"/thing": {
				get: {
					operationId: "getThingCommand",
					responses: {
						"200": {
							description: "OK",
							content: {
								"application/json": {
									schema: { $ref: `#/components/schemas/${name}` },
								},
							},
						},
					},
				},
			},
		},
	};
}

test("additionalProperties types the record value instead of widening to unknown", async () => {
	const result = await processOpenApiDocument(
		"/tmp/whatever",
		docWithSchema("Labels", {
			type: "object",
			additionalProperties: { type: "string" },
		}),
	);

	await expectGenerated([result.typesFile, result.valibotFile]);
});

test("additionalProperties alongside properties keeps the extra keys valid", async () => {
	const result = await processOpenApiDocument(
		"/tmp/whatever",
		docWithSchema("Config", {
			type: "object",
			properties: { name: { type: "string" } },
			additionalProperties: { type: "number" },
		}),
	);

	await expectGenerated([result.valibotFile]);
});

test("additionalProperties true accepts any key", async () => {
	const result = await processOpenApiDocument(
		"/tmp/whatever",
		docWithSchema("Open", {
			type: "object",
			properties: { name: { type: "string" } },
			additionalProperties: true,
		}),
	);

	await expectGenerated([result.valibotFile]);
});

test("an empty properties bag is a record, not an empty object type", async () => {
	const result = await processOpenApiDocument(
		"/tmp/whatever",
		docWithSchema("Empty", { type: "object", properties: {} }),
	);

	await expectGenerated([result.typesFile]);
});

test("the generated JSON body type is PascalCase", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/batches": {
				post: {
					operationId: "createBatch",
					requestBody: {
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: { input_file_id: { type: "string" } },
								},
							},
						},
					},
					responses: respOk,
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	await expectGenerated([result.typesFile]);
});

test("an operation with both a 200 and a 204 emits one output type argument", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/auth": {
				post: {
					operationId: "systemAuthCommand",
					responses: {
						"200": {
							description: "OK",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: { t: { type: "string" } },
									},
								},
							},
						},
						"204": { description: "No content" },
					},
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	await expectGenerated([result.commandsFile]);
});

test("an array request body with parameters stays readable as both", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/plugins/pull": {
				post: {
					operationId: "pluginPullCommand",
					parameters: [
						{
							name: "remote",
							in: "query",
							required: true,
							schema: { type: "string" },
						},
					],
					requestBody: {
						content: {
							"application/json": {
								schema: { type: "array", items: { type: "string" } },
							},
						},
					},
					responses: respOk,
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	await expectGenerated([result.typesFile, result.commandsFile]);
});

test("nested query param members get the same stringish treatment as top-level ones", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/search": {
				get: {
					operationId: "searchCommand",
					parameters: [
						{
							name: "limit",
							in: "query",
							required: false,
							schema: { type: "integer" },
						},
						{
							name: "filter",
							in: "query",
							required: false,
							schema: {
								type: "object",
								properties: {
									age: { type: "integer" },
									big: { type: "integer", format: "int64" },
									active: { type: "boolean" },
									label: { type: "string" },
								},
							},
						},
						{
							name: "ids",
							in: "query",
							required: false,
							schema: { type: "array", items: { type: "integer" } },
						},
					],
					responses: respOk,
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	await expectGenerated([result.typesFile]);
});

test("json request body members keep their real JSON types, nested included", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/containers": {
				post: {
					operationId: "createContainerCommand",
					requestBody: {
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										tty: { type: "boolean" },
										retries: { type: "integer" },
										health: {
											type: "object",
											properties: {
												interval: { type: "integer", format: "int64" },
												enabled: { type: "boolean" },
											},
										},
										sizes: { type: "array", items: { type: "integer" } },
									},
								},
							},
						},
					},
					responses: respOk,
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	await expectGenerated([result.typesFile]);
});

// Composition has to forward the codegen options the same way the array and
// object branches do, or a oneOf collapses back to the JSON types
test("a oneOf query param keeps the stringish wire types in every branch", async () => {
	const schema: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/things": {
				get: {
					operationId: "listThingsCommand",
					parameters: [
						{
							name: "size",
							in: "query",
							required: false,
							schema: {
								oneOf: [{ type: "integer" }, { type: "string" }],
							},
						},
						{
							name: "flag",
							in: "query",
							required: false,
							schema: {
								anyOf: [{ type: "boolean" }, { type: "string" }],
							},
						},
						{
							name: "nested",
							in: "query",
							required: false,
							schema: {
								type: "object",
								properties: {
									count: {
										oneOf: [{ type: "integer" }, { type: "string" }],
									},
								},
							},
						},
					],
					responses: respOk,
				},
			},
		},
	};

	const result = await processOpenApiDocument("/tmp/whatever", schema);

	await expectGenerated([result.typesFile]);
});
