import path from "node:path";
import type { oas32 } from "openapi3-ts";
import { processOpenApiDocument } from "../lib/process-document.ts";

function buildQueryParameterDocument(
	parameters: readonly oas32.ParameterObject[],
): oas32.OpenAPIObject {
	return {
		openapi: "3.2.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/things": {
				get: {
					operationId: "listThingsCommand",
					parameters: [...parameters],
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

export async function generateWithQueryParameters(
	parameters: readonly oas32.ParameterObject[],
) {
	// This path names the emitted files, which stay in memory
	const outputDir = path.join(import.meta.dirname, ".generated");

	return processOpenApiDocument(
		outputDir,
		buildQueryParameterDocument(parameters),
	);
}

export async function generateCommandsText(
	parameters: readonly oas32.ParameterObject[],
) {
	const result = await generateWithQueryParameters(parameters);

	return result.commandsFile.getText();
}
