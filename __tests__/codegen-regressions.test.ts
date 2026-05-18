import type { oas31 } from "openapi3-ts";
import { expect, test } from "vitest";
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
	expect(mainText).not.toMatch(/import \{[^}]*type\s+UndefinedOnPartialDeep[^}]*\}\s+from\s+"type-fest"/);
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
	const queryBlock =
		typesText.match(/export type ListFilesCommandQuery = \{[\s\S]*?\};/)?.[0] ??
		"";

	expect(queryBlock).toContain("purpose?: string");
	expect(queryBlock).toContain("limit?: `${number}`");
	expect(queryBlock).not.toContain("undefined");
});

test("AllInputs union includes every command's Input (no silent drops)", async () => {
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

	const allInputsBlock =
		mainText.match(/type AllInputs =[\s\S]*?;/)?.[0] ?? "";

	const commandNames = [
		...commandsText.matchAll(/^export class (\w+Command) extends Command</gm),
	].map((m) => m[1] ?? "");

	expect(commandNames.length).toBeGreaterThan(0);
	const missing = commandNames.filter(
		(name) => !allInputsBlock.includes(`${name}Input`),
	);
	expect(missing).toEqual([]);
});
