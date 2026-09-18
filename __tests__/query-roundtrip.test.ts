import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import type { oas31 } from "openapi3-ts";
import { expect, test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";
import { listauditlogs } from "./fixtures/openai/hono.ts";
import { findPets } from "./fixtures/petstore/hono.ts";

// A query parameter's `style` and `explode` decide how a client writes it into
// a query string, so they also decide how the server has to read it back. These
// take the exact query string a client sends for an operation, hand it to that
// same operation's generated middleware through a real Hono app, and check that
// what comes out of validation is what went in.
//
// The client half of each contract is pinned on the other side, by the
// "query string building" tests in @block65/rest-client — this repo installs a
// released copy of that package, which predates the style work, so the wire
// strings here are written out rather than generated
async function validatedQuery(
	middleware: readonly MiddlewareHandler[],
	search: string,
): Promise<unknown> {
	const res = await appFor(middleware).request(`/target?${search}`);
	const body = await res.clone().text();

	// the body says why a route rejected the query, so it rides along into the
	// failure output
	expect({ status: res.status, body }).toMatchObject({ status: 200 });

	return res.json();
}

// OpenAI's ListAuditLogs `effective_at` is an object and its document states no
// style, so OpenAPI's default applies: the members go out on their own, without
// the parent name, and only the member list the document declares can put them
// back together
test("an object query parameter under the default style survives the round trip", async () => {
	const query = {
		effective_at: { gt: 1700000000, lte: 1700000100 },
		limit: 20,
		after: "audit_log_abc",
	};

	const search = new URLSearchParams([
		["gt", "1700000000"],
		["lte", "1700000100"],
		["limit", "20"],
		["after", "audit_log_abc"],
	]).toString();

	expect(search).toBe(
		"gt=1700000000&lte=1700000100&limit=20&after=audit_log_abc",
	);

	await expect(validatedQuery(listauditlogs, search)).resolves.toStrictEqual(
		query,
	);
});

// the parent stays absent rather than arriving as an empty object
test("an absent object query parameter does not materialise", async () => {
	await expect(validatedQuery(listauditlogs, "limit=5")).resolves.toStrictEqual(
		{
			limit: 5,
		},
	);
});

// Hono hands a validator one repeated key as an array but a single occurrence
// as a bare string, which an array schema rejects
test("an array query parameter with one value is still an array", async () => {
	await expect(validatedQuery(findPets, "tags=cat")).resolves.toStrictEqual({
		tags: ["cat"],
	});

	await expect(
		validatedQuery(findPets, "tags=cat&tags=dog"),
	).resolves.toStrictEqual({
		tags: ["cat", "dog"],
	});
});

// Nothing in the corpus declares `deepObject` or puts `explode: false` on an
// object, so those shapes have no fixture to borrow: the server is generated
// from a document written here, written to disk and imported, so the round trip
// runs real generated code rather than matching against its text
const generatedRoot = join(import.meta.dirname, ".generated");

// The validated data's key is not visible through a spread of middleware, so
// the handler reads it untyped
function appFor(middleware: readonly MiddlewareHandler[]) {
	const app = new Hono();

	for (const handler of middleware) {
		app.use("/target", handler);
	}

	app.get("/target", (c) => c.json(c.req.valid("query" as never)));

	return app;
}

async function serverFor(
	name: string,
	parameters: oas31.ParameterObject[],
): Promise<readonly MiddlewareHandler[]> {
	const document: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/things": {
				get: {
					operationId: "listThingsCommand",
					parameters,
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

	const outputDir = join(generatedRoot, name);
	const result = await processOpenApiDocument(outputDir, document);

	await rm(outputDir, { recursive: true, force: true });
	await mkdir(outputDir, { recursive: true });
	await Promise.all([result.honoFile.save(), result.valibotFile.save()]);

	const module = (await import(join(outputDir, "hono.ts"))) as Record<
		string,
		unknown
	>;

	// a one-operation document produces exactly one middleware export, and its
	// name is the operationId run through the generator's own casing rules
	const middleware = Object.values(module).find((value) =>
		Array.isArray(value),
	);

	expect(middleware).toBeDefined();

	return middleware as readonly MiddlewareHandler[];
}

const rangeSchema: oas31.SchemaObject = {
	type: "object",
	properties: {
		gt: { type: "integer" },
		lte: { type: "integer" },
	},
};

test("a deepObject parameter survives the round trip as bracket keys", async () => {
	const middleware = await serverFor("deep-object", [
		{
			name: "at",
			in: "query",
			style: "deepObject",
			explode: true,
			schema: rangeSchema,
		},
	]);

	const search = new URLSearchParams([
		["at[gt]", "1700000000"],
		["at[lte]", "1700000100"],
	]).toString();

	expect(search).toBe("at%5Bgt%5D=1700000000&at%5Blte%5D=1700000100");

	await expect(validatedQuery(middleware, search)).resolves.toStrictEqual({
		at: { gt: 1700000000, lte: 1700000100 },
	});
});

// the collision the default style cannot express, which deepObject can
test("two deepObject parameters sharing a member name stay apart", async () => {
	const middleware = await serverFor("deep-object-pair", [
		{ name: "created", in: "query", style: "deepObject", schema: rangeSchema },
		{ name: "updated", in: "query", style: "deepObject", schema: rangeSchema },
	]);

	const search = new URLSearchParams([
		["created[gt]", "1"],
		["updated[gt]", "2"],
	]).toString();

	await expect(validatedQuery(middleware, search)).resolves.toStrictEqual({
		created: { gt: 1 },
		updated: { gt: 2 },
	});
});

test("an explode: false array survives the round trip joined on its delimiter", async () => {
	const middleware = await serverFor("joined", [
		{
			name: "names",
			in: "query",
			style: "form",
			explode: false,
			schema: { type: "array", items: { type: "string" } },
		},
		{
			name: "ids",
			in: "query",
			style: "pipeDelimited",
			explode: false,
			schema: { type: "array", items: { type: "integer" } },
		},
	]);

	const search = new URLSearchParams([
		["names", "alpha,beta"],
		["ids", "1|2"],
	]).toString();

	await expect(validatedQuery(middleware, search)).resolves.toStrictEqual({
		names: ["alpha", "beta"],
		ids: [1, 2],
	});
});

// A key the decoder cannot place is left exactly as it arrived, so a strict
// schema rejects it by name instead of the request quietly losing a value
test("a malformed bracket key is rejected by name rather than reinterpreted", async () => {
	const middleware = await serverFor("malformed", [
		{
			name: "at",
			in: "query",
			style: "deepObject",
			explode: true,
			schema: rangeSchema,
		},
	]);

	const app = appFor(middleware);
	app.onError((error, c) => c.json({ detail: JSON.stringify(error) }, 400));

	const res = await app.request(
		`/target?${new URLSearchParams([["at[gt", "1"]]).toString()}`,
	);

	expect(res.status).toBe(400);
	await expect(res.text()).resolves.toContain("at[gt");
});

// The document is the only thing that says where a member belongs, so a
// parameter that declares no style is worth saying out loud
test("an object query parameter with no declared style is warned about", async () => {
	const warnings: string[] = [];
	const original = console.warn;
	console.warn = (message: string) => warnings.push(message);

	try {
		await serverFor("unstyled", [
			{ name: "at", in: "query", schema: rangeSchema },
		]);
	} finally {
		console.warn = original;
	}

	expect(warnings.join("\n")).toContain(
		'query parameter "at" is an object but declares no `style`',
	);
});

// Two such parameters cannot be told apart once their members lose the parent
// name, and no encoding this generator could pick would change that
test("two default-style object parameters sharing a member name are warned about", async () => {
	const warnings: string[] = [];
	const original = console.warn;
	console.warn = (message: string) => warnings.push(message);

	const document: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/things": {
				get: {
					operationId: "listThingsCommand",
					parameters: [
						{ name: "created", in: "query", schema: rangeSchema },
						{ name: "updated", in: "query", schema: rangeSchema },
					],
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

	try {
		await processOpenApiDocument("/tmp/roundtrip-collision", document);
	} finally {
		console.warn = original;
	}

	expect(warnings.join("\n")).toContain(
		'both send a member named "gt" without the parent name',
	);
});

async function warningsFrom(parameters: oas31.ParameterObject[]) {
	const warnings: string[] = [];
	const original = console.warn;
	console.warn = (message: string) => warnings.push(message);

	try {
		await serverFor(`warn-${warnings.length}-${Math.random()}`, parameters);
	} finally {
		console.warn = original;
	}

	return warnings.join("\n");
}

// OpenAPI marks these n/a and leaves them undefined, so the generator says so
// rather than both sides confidently producing something different
test("style and explode combinations the spec leaves undefined are warned about", async () => {
	const arrayOfStrings = {
		type: "array",
		items: { type: "string" },
	} as const;

	await expect(
		warningsFrom([
			{
				name: "ids",
				in: "query",
				style: "pipeDelimited",
				explode: true,
				schema: arrayOfStrings,
			},
		]),
	).resolves.toContain("`style: pipeDelimited` with `explode: true`");

	await expect(
		warningsFrom([
			{
				name: "ids",
				in: "query",
				style: "deepObject",
				schema: arrayOfStrings,
			},
		]),
	).resolves.toContain("is an array with `style: deepObject`");
});

// `in: "querystring"` matches no branch in the parameter loop, so without a
// word from the generator the operation silently loses its query entirely
test("an in: querystring parameter is warned about rather than dropped in silence", async () => {
	const warning = await warningsFrom([
		{
			name: "whole",
			in: "querystring",
			content: { "application/json": { schema: { type: "object" } } },
		} as unknown as oas31.ParameterObject,
	]);

	expect(warning).toContain("uses `in: querystring`");
});
