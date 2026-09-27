import type { SourceFile } from "ts-morph";

// an insert re-parses its whole chunk, so a small chunk keeps inserts cheap
const chunkSize = 10;

const chunksByFile = new WeakMap<SourceFile, SourceFile[]>();

/**
 * ts-morph re-parses a whole file on every insert, so a module of thousands
 * of statements is built in small scratch files that join it once complete.
 *
 * A statement declared while building the arguments of another can start a
 * new chunk and land after it, so declare it first
 */
export function openChunk(file: SourceFile) {
	const chunks = chunksByFile.get(file) ?? [];
	const last = chunks.at(-1);

	if (last && last.getStatements().length < chunkSize) {
		return last;
	}

	const chunk = file
		.getProject()
		.createSourceFile(`${file.getFilePath()}.${chunks.length}.chunk.ts`, "", {
			overwrite: true,
		});

	chunks.push(chunk);
	chunksByFile.set(file, chunks);

	return chunk;
}

// the gap ts-morph left between statements, blank only between classes
function readStatementSeparator(chunk: SourceFile) {
	const [before, last] = chunk.getStatements().slice(-2);

	return before && last
		? chunk.getFullText().slice(before.getEnd(), last.getStart(true))
		: "\n";
}

/**
 * Moves the chunked statements into the module, after its imports. Call it
 * before anything reads the module back
 */
export function joinChunks(file: SourceFile) {
	const chunks = chunksByFile.get(file) ?? [];

	if (chunks.length > 0) {
		const text = chunks
			.map((chunk, index) => {
				const next = chunks[index + 1];
				const body = chunk.getFullText().trim();

				return next ? body + readStatementSeparator(chunk) : body;
			})
			.join("");

		// a typed insert sets itself off from the imports, and text does not
		file.addStatements(
			file.getStatements().length > 0
				? (writer) => writer.newLine().write(text)
				: text,
		);
	}

	for (const chunk of chunks) {
		chunk.forget();
	}

	chunksByFile.delete(file);
}
