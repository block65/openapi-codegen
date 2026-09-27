import { expect } from "vitest";

type GeneratedFile = { getBaseName(): string; getText(): string };

/**
 * Snapshots each file whole, keyed by its name, so a generator change reviews
 * as a diff of the code it emits
 */
export function expectGenerated(files: GeneratedFile[]) {
	for (const file of files) {
		expect(file.getText()).toMatchSnapshot(file.getBaseName());
	}
}
