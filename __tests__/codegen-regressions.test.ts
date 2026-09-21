import path from "node:path";
import type { oas31 } from "openapi3-ts";
import { assert, expect, test } from "vitest";
import { generatedFiles } from "../lib/oxlint.ts";
import { processOpenApiDocument } from "../lib/process-document.ts";

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
	const mainText = result.mainFile.getText();

	expect(mainText).toMatch(
		/import type \{[^}]*OneCommandInput[^}]*\}\s+from\s+"\.\/types\.js"/,
	);
	expect(mainText).toMatch(
		/import type \{[^}]*UndefinedOnPartialDeep[^}]*\}\s+from\s+"type-fest"/,
	);
	expect(mainText).not.toMatch(/import \{[^}]*type\s+OneCommandInput/);
	expect(mainText).not.toMatch(
		/import \{[^}]*type\s+UndefinedOnPartialDeep[^}]*\}\s+from\s+"type-fest"/,
	);
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
	const typesText = result.typesFile.getText();
	const queryBlock = typesText.match(
		/export type ListFilesCommandQuery = \{[\s\S]*?\};/,
	)?.[0];
	assert.isDefined(queryBlock, "ListFilesCommandQuery");

	expect(queryBlock).toContain("purpose?: string");
	expect(queryBlock).toContain("limit?: `${number}`");
	expect(queryBlock).not.toContain("undefined");
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
	const mainText = result.mainFile.getText();
	const commandsText = result.commandsFile.getText();
	const typesText = result.typesFile.getText();

	const allInputsBlock = mainText.match(/type AllInputs =[\s\S]*?;/)?.[0];
	assert.isDefined(allInputsBlock, "AllInputs");

	const commandNames = [
		...commandsText.matchAll(/^export class (\w+Command) extends Command</gm),
	].map(([, name]) => {
		assert.isDefined(name, "command name");

		return name;
	});

	expect(commandNames.length).toBeGreaterThan(0);

	// a command declaring only responses gets an input of `never`
	const hasNeverInput = (name: string) =>
		typesText.includes(`export type ${name}Input = never;`);

	const missing = commandNames
		.filter((name) => !hasNeverInput(name))
		.filter((name) => !allInputsBlock.includes(`${name}Input`));

	expect(missing).toEqual([]);

	// `never` adds nothing to the union, and the three empty paths above put
	// it on these three commands
	const emptyCommands = commandNames.filter((name) => hasNeverInput(name));

	expect(emptyCommands.toSorted()).toEqual([
		"AlphaCommand",
		"BetaCommand",
		"GammaCommand",
	]);

	const carried = emptyCommands.filter((name) =>
		allInputsBlock.includes(`${name}Input`),
	);

	expect(carried).toEqual([]);
});

// `generatedFiles` limits the shipped lint override, so an emitted module
// absent from that list would lint unscoped at every consumer
test("the shipped lint override names every file the generator emits", async () => {
	const result = await processOpenApiDocument(
		"/tmp/generated-file-set",
		docWithSchema("Thing", { type: "object", properties: {} }),
	);

	const emitted = Object.values(result)
		.map((file) => path.basename(file.getFilePath()))
		.toSorted();

	expect(emitted).toStrictEqual([...generatedFiles].toSorted());
});

// An empty schema permits any value, so the keys outside `properties` are
// unconstrained and the object is loose
test("additionalProperties chooses the object schema", async () => {
	const cases = [
		[{}, "v.looseObject("],
		[{ type: "string" }, "v.objectWithRest("],
		[false, "v.strictObject("],
		[true, "v.looseObject("],
	] as const;

	const emitted = await Promise.all(
		cases.map(async ([additionalProperties]) => {
			const result = await processOpenApiDocument(
				"/tmp/additional-properties",
				docWithSchema("Open", {
					type: "object",
					properties: { a: { type: "string" } },
					additionalProperties,
				}),
			);

			const text = result.valibotFile.getText();

			return text.slice(text.indexOf("export const openSchema"), -1);
		}),
	);

	for (const [index, [, expected]] of cases.entries()) {
		expect(emitted[index]).toContain(expected);
	}
});

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

	expect(result.typesFile.getText()).toContain(
		"Record<string | number, string>",
	);
	expect(result.valibotFile.getText()).toContain(
		"v.record(v.string(), v.string())",
	);
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

	const valibotText = result.valibotFile.getText();

	expect(valibotText).toContain("v.objectWithRest(");
	expect(valibotText).not.toMatch(/v\.strictObject\(\{\s*name:/);
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

	expect(result.valibotFile.getText()).toContain("v.looseObject(");
});

test("an empty properties bag is a record, not an empty object type", async () => {
	const result = await processOpenApiDocument(
		"/tmp/whatever",
		docWithSchema("Empty", { type: "object", properties: {} }),
	);

	const typesText = result.typesFile.getText();

	expect(typesText).toContain("Record<string | number, Jsonifiable>");
	expect(typesText).not.toMatch(/=\s*\{\};/);
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

	expect(result.typesFile.getText()).toContain("type CreateBatchJsonBody");
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
	const extendsClause =
		result.commandsFile
			.getClass("SystemAuthCommand")
			?.getExtends()
			?.getTypeArguments()
			.map((arg) => arg.getText()) ?? [];

	expect(extendsClause).not.toContain("undefined");
	expect(extendsClause.length).toBeLessThanOrEqual(2);
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
	const inputBlock = result.typesFile
		.getTypeAlias("PluginPullCommandInput")
		?.getTypeNode()
		?.getText();
	assert.isDefined(inputBlock, "PluginPullCommandInput");

	expect(inputBlock).toContain("PluginPullCommandBodyWrapper");
	expect(result.commandsFile.getText()).toMatch(
		/const \{\s*remote,\s*body\s*\} = input/,
	);
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
	const queryBlock = result.typesFile
		.getTypeAlias("SearchCommandQuery")
		?.getTypeNode()
		?.getText();
	assert.isDefined(queryBlock, "SearchCommandQuery");

	expect(queryBlock).toMatch(/limit\?: `\$\{number\}`/);
	expect(queryBlock).toMatch(/"age"\?: `\$\{number\}`/);
	expect(queryBlock).toMatch(/"big"\?: `\$\{bigint\}`/);
	expect(queryBlock).toMatch(/"active"\?: "true" \| "false"/);
	expect(queryBlock).toMatch(/"label"\?: string/);
	expect(queryBlock).toMatch(/ids\?: readonly \(`\$\{number\}`\)\[\]/);
	expect(queryBlock).not.toMatch(/"age"\?: number/);
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
	const bodyBlock = result.typesFile
		.getTypeAlias("CreateContainerCommandJsonBody")
		?.getTypeNode()
		?.getText();
	assert.isDefined(bodyBlock, "CreateContainerCommandJsonBody");

	expect(bodyBlock).toMatch(/"tty"\?: boolean/);
	expect(bodyBlock).toMatch(/"retries"\?: number/);
	expect(bodyBlock).toMatch(/"interval"\?: bigint/);
	expect(bodyBlock).toMatch(/"enabled"\?: boolean/);
	expect(bodyBlock).toMatch(/"sizes"\?: readonly \(number\)\[\]/);
	expect(bodyBlock).not.toContain('"true" | "false"');
	expect(bodyBlock).not.toContain("`${number}`");
});

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
	const queryBlock = result.typesFile
		.getTypeAlias("ListThingsCommandQuery")
		?.getTypeNode()
		?.getText();
	assert.isDefined(queryBlock, "ListThingsCommandQuery");

	// Composition has to forward the codegen options the same way the array
	// and object branches do, or a oneOf collapses back to the JSON types
	expect(queryBlock).toContain("`${number}`");
	expect(queryBlock).toContain('"true" | "false"');
	expect(queryBlock).not.toMatch(/size\?: number/);
	expect(queryBlock).not.toMatch(/flag\?: boolean/);
	expect(queryBlock).not.toMatch(/"count"\?: number/);
});
