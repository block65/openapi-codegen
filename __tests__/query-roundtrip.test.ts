import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import type { oas31 } from "openapi3-ts";
import { expect, test } from "vitest";
import { listauditlogs } from "./fixtures/openai/hono.ts";
import { findPets } from "./fixtures/petstore/hono.ts";
import { generateFor, type TestParameter } from "./generate.ts";

// Runs a real query string through the generated middleware and back out
async function validatedQuery(
	middleware: readonly MiddlewareHandler[],
	search: string,
) {
	// Coverage of the client half lives with the "query string building" tests
	// in @block65/rest-client, so the wire strings here are written by hand
	const res = await appFor(middleware).request(`/target?${search}`);
	const body = await res.clone().text();

	// the body says why a route rejected the query, so the failure output
	// includes it
	expect({ status: res.status, body }).toMatchObject({ status: 200 });

	return res.json();
}

// an absent parent stays absent, and never arrives as an empty object
test("an absent object query parameter does not materialise", async () => {
	await expect(validatedQuery(listauditlogs, "limit=5")).resolves.toStrictEqual(
		{
			limit: 5,
		},
	);
});

// Generated middleware validates the query as Hono parsed it, so the
// encodings below reach the schema in a shape it turns down. The hook
// throws PublicValidationError, and a bare app returns 500 for it
test("a single value for an array parameter is rejected", async () => {
	const res = await appFor(findPets).request("/target?tags=cat");

	expect(res.status).toBe(500);
});

test("joined values for an array parameter are rejected", async () => {
	const searches = ["tags=a,b", "tags=a%20b", "tags=a%7Cb"];

	const results = await Promise.all(
		searches.map(async (search) => {
			const res = await appFor(findPets).request(`/target?${search}`);

			return { search, status: res.status };
		}),
	);

	expect(results).toStrictEqual(
		searches.map((search) => ({ search, status: 500 })),
	);
});

// A generated client sends an array as a repeated key
test("repeated keys for an array parameter are accepted", async () => {
	await expect(
		validatedQuery(findPets, "tags=cat&tags=dog"),
	).resolves.toStrictEqual({ tags: ["cat", "dog"] });
});

// Mounts the middleware on a Hono app, with an untyped handler reading it
function appFor(middleware: readonly MiddlewareHandler[]) {
	const app = new Hono();

	for (const handler of middleware) {
		app.use("/target", handler);
	}

	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- c.req.valid reads its key from the validator types a route was built with, and these middleware arrive as an opaque array, so the key is unreachable through the spread
	app.get("/target", (c) => c.json(c.req.valid("query" as never)));

	return app;
}

// Collects what the generator says while it walks a document
async function warningsFrom(parameters: readonly TestParameter[]) {
	const warnings: string[] = [];
	const original = console.warn;
	console.warn = (message: string) => warnings.push(message);

	try {
		await generateFor(parameters);
	} finally {
		console.warn = original;
	}

	return warnings.join("\n");
}

// rest-client encodes only these four
test("a style rest-client cannot encode stops generation", async () => {
	await expect(
		generateFor([
			{
				name: "id",
				in: "query",
				style: "matrix",
				schema: { type: "array", items: { type: "string" } },
			},
		]),
	).rejects.toThrow("which rest-client does not encode");
});

// queryParameterSpec covers arrays and objects, so a scalar reaches the
// n/a check through its encoding
test("a scalar in an n/a style and explode stops generation", async () => {
	await expect(
		generateFor([
			{
				name: "id",
				in: "query",
				style: "spaceDelimited",
				explode: true,
				schema: { type: "string" },
			},
		]),
	).rejects.toThrow("which OpenAPI marks n/a and leaves undefined");
});

const rangeSchema: oas31.SchemaObject = {
	type: "object",
	properties: {
		gt: { type: "integer" },
		lte: { type: "integer" },
	},
};

// Member placement comes from the document alone, so an undeclared style is
// worth saying out loud
test("an object query parameter with no declared style is warned about", async () => {
	await expect(
		warningsFrom([{ name: "at", in: "query", schema: rangeSchema }]),
	).resolves.toContain(
		'query parameter "at" is an object but declares no `style`',
	);
});

// Two such parameters read alike once their members lose the parent name, and
// every encoding this generator could pick keeps them alike
test("two default-style object parameters sharing a member name are warned about", async () => {
	await expect(
		warningsFrom([
			{ name: "created", in: "query", schema: rangeSchema },
			{ name: "updated", in: "query", schema: rangeSchema },
		]),
	).resolves.toContain('both send a member named "gt" without the parent name');
});

// OpenAPI marks these n/a and leaves them undefined, so rest-client stops at
// five serializers. Generation stops here for the same reason
test("style and explode combinations the spec leaves undefined stop generation", async () => {
	const arrayOfStrings = {
		type: "array",
		items: { type: "string" },
	} as const;

	await expect(
		generateFor([
			{
				name: "ids",
				in: "query",
				style: "pipeDelimited",
				explode: true,
				schema: arrayOfStrings,
			},
		]),
	).rejects.toThrow("`style: pipeDelimited` with `explode: true`");

	await expect(
		generateFor([
			{
				name: "ids",
				in: "query",
				style: "deepObject",
				schema: arrayOfStrings,
			},
		]),
	).rejects.toThrow("is an array with `style: deepObject`");
});

// `in: "querystring"` matches no branch in the parameter loop, so generating
// the operation would lose its query in silence
test("an in: querystring parameter stops generation", async () => {
	await expect(
		generateFor([
			{
				name: "whole",
				in: "querystring",
				content: { "application/json": { schema: { type: "object" } } },
			},
		]),
	).rejects.toThrow("uses `in: querystring`");
});

test("an in: cookie parameter stops generation", async () => {
	await expect(
		generateFor([
			{ name: "session", in: "cookie", schema: { type: "string" } },
		]),
	).rejects.toThrow('parameter "session" uses `in: cookie`');
});
