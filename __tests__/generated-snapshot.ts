import path from "node:path";
import { expect } from "vitest";

type GeneratedFile = { getBaseName(): string; getText(): string };

function slug(text: string) {
	return text
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/^-|-$/g, "");
}

/**
 * Snapshots each file into a folder named for the current test, so a generator
 * change reviews as a diff of the code it emits
 */
export async function expectGenerated(files: GeneratedFile[]) {
	const { currentTestName, testPath } = expect.getState();
	const folder = `${path.basename(testPath ?? "unknown", ".test.ts")}/${slug(currentTestName ?? "unknown")}`;

	await Promise.all(
		files.map((file) =>
			expect(file.getText()).toMatchFileSnapshot(
				`__snapshots__/${folder}/${file.getBaseName()}`,
			),
		),
	);
}
