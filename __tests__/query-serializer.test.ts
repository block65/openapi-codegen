import type { oas32 } from "openapi3-ts";
import { assert, expect, test } from "vitest";
import { ImageCreateCommand } from "./fixtures/docker/commands.ts";
import { FindPetsCommand } from "./fixtures/petstore/commands.ts";
import {
	generateCommandsText,
	generateWithQueryParameters,
} from "./helpers.ts";

const arrayOfStrings: oas32.SchemaObject = {
	type: "array",
	items: { type: "string" },
};

const rangeSchema: oas32.SchemaObject = {
	type: "object",
	properties: {
		gt: { type: "integer" },
		lte: { type: "integer" },
	},
};

// What a serializer writes is rest-client's to test, from the spec's own
// examples. What is tested here is which one a command names
test("a departure from the default encoding names a serializer", async () => {
	const commands = await generateCommandsText([
		{
			name: "names",
			in: "query",
			style: "pipeDelimited",
			explode: false,
			schema: arrayOfStrings,
		},
	]);

	expect(commands).toContain(
		"public override querySerializer = pipeDelimitedSerializer;",
	);
	expect(commands).toMatch(
		/import \{[^}]*pipeDelimitedSerializer[^}]*\} from "@block65\/rest-client"/,
	);
});

// An unnamed serializer is form with explode, so naming it would be noise
test("the default encoding names nothing", async () => {
	const commands = await generateCommandsText([
		{
			name: "tags",
			in: "query",
			style: "form",
			explode: true,
			schema: arrayOfStrings,
		},
	]);

	expect(commands).not.toContain("querySerializer");
});

// One serializer covers the whole query. A scalar reads alike under every
// style, and deepObject writes an array as form with explode, so deepObject
// is the serializer all three parameters share
test("a deepObject parameter sets the serializer for its operation", async () => {
	const commands = await generateCommandsText([
		{ name: "limit", in: "query", schema: { type: "integer" } },
		{ name: "tags", in: "query", schema: arrayOfStrings },
		{ name: "filter", in: "query", style: "deepObject", schema: rangeSchema },
	]);

	expect(commands).toContain(
		"public override querySerializer = deepObjectSerializer;",
	);
});

// A command names one serializer, so two parameters that need different
// ones stop generation
test("query parameters needing different serializers stop generation", async () => {
	await expect(
		generateWithQueryParameters([
			{
				name: "tags",
				in: "query",
				style: "form",
				explode: false,
				schema: arrayOfStrings,
			},
			{ name: "filter", in: "query", style: "deepObject", schema: rangeSchema },
		]),
	).rejects.toThrow("are written by different serializers");
});

// A consumer compiles against the import and the property
async function extractCommandSource(
	parameters: readonly oas32.ParameterObject[],
) {
	const { commandsFile } = await generateWithQueryParameters(parameters);

	const restClientImport = commandsFile.getImportDeclarationOrThrow(
		(declaration) =>
			declaration.getModuleSpecifier().getLiteralValue() ===
			"@block65/rest-client",
	);

	const [command] = commandsFile.getClasses();
	assert(command);

	return [restClientImport.getText(), command.getText()].join("\n\n");
}

test("the source of a command that names a serializer", async () => {
	await expect(
		extractCommandSource([
			{ name: "limit", in: "query", schema: { type: "integer" } },
			{ name: "filter", in: "query", style: "deepObject", schema: rangeSchema },
		]),
	).resolves.toMatchSnapshot();
});

test("the source of a command that names none", async () => {
	await expect(
		extractCommandSource([
			{ name: "limit", in: "query", schema: { type: "integer" } },
			{ name: "tags", in: "query", schema: arrayOfStrings },
		]),
	).resolves.toMatchSnapshot();
});

// findPets declares tags before limit, which is not alphabetical order
const findPets = new FindPetsCommand({ tags: ["cat", "dog"], limit: "10" });

// ImageCreate declares seven query parameters and names formJoinSerializer
const imageCreate = new ImageCreateCommand({
	body: "",
	tag: "latest",
	fromImage: "alpine",
	changes: ["ENV a=1", "ENV b=2"],
	platform: "linux/amd64",
});

// A change in how the constructor assembles the query — the destructuring,
// stripUndefined, a spread — moves these keys
test("the generated query serializes in document order", () => {
	expect(findPets.querySerializer(findPets.query ?? {})).toMatchSnapshot(
		"findPets",
	);
	expect(imageCreate.querySerializer(imageCreate.query ?? {})).toMatchSnapshot(
		"imageCreate",
	);
});
