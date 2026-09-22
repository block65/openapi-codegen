import path from "node:path";
import type { oas31 } from "openapi3-ts";
import { processOpenApiDocument } from "../lib/process-document.ts";

// OAS 3.2 added `in: "querystring"`, which the 3.1 types predate
export type TestParameter =
	| oas31.ParameterObject
	| {
			name: string;
			in: "querystring";
			content: oas31.ParameterObject["content"];
	  };

export function documentFor(
	parameters: readonly TestParameter[],
): oas31.OpenAPIObject {
	return {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/things": {
				get: {
					operationId: "listThingsCommand",
					// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- TestParameter widens the 3.1 union by the one 3.2 location these tests exercise, and processOpenApiDocument takes a 3.1 document
					parameters: parameters as oas31.ParameterObject[],
					responses: {
						"200": {
							description: "OK",
							content: { "application/json": { schema: { type: "string" } } },
						},
					},
				},
			},
		},
	};
}

export async function generateFor(parameters: readonly TestParameter[]) {
	// This path names the emitted files, which stay in memory
	const outputDir = path.join(import.meta.dirname, ".generated");

	return processOpenApiDocument(outputDir, documentFor(parameters));
}

export async function commandsFor(parameters: readonly TestParameter[]) {
	const result = await generateFor(parameters);

	return result.commandsFile.getText();
}
