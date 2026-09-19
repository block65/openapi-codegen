import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import type { oas31 } from "openapi3-ts";
import { expect, test } from "vitest";
import { processOpenApiDocument } from "../lib/process-document.ts";
import { listauditlogs } from "./fixtures/openai/hono.ts";
import { findPets } from "./fixtures/petstore/hono.ts";

// Runs a real query string through the generated middleware and back out
async function validatedQuery(
	middleware: readonly MiddlewareHandler[],
	search: string,
) {
	const res = await appFor(middleware).request(`/target?${search}`);
	const body = await res.clone().text();

	// the body says why a route rejected the query, so the failure output
	// includes it
	expect({ status: res.status, body }).toMatchObject({ status: 200 });

	return res.json();
}

// OpenAI's ListAuditLogs `effective_at` is an object and its document states
// no style. OpenAPI's default sends the members without the parent name, and
// the declared member list is what puts them back together
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

// an absent parent stays absent, and never arrives as an empty object
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

// Root for documents generated, written to disk and imported by these tests
const generatedRoot = join(import.meta.dirname, ".generated");

// Mounts the middleware on a Hono app, with an untyped handler reading it
function appFor(middleware: readonly MiddlewareHandler[]) {
	const app = new Hono();

	for (const handler of middleware) {
		app.use("/target", handler);
	}

	// TYPESAFETY: `c.req.valid` reads the key from the validator types a route
	// was built with, and these middleware arrive as an opaque array, so the
	// key is unreachable through the spread
	app.get("/target", (c) => c.json(c.req.valid("query" as never)));

	return app;
}

// OAS 3.2 added `in: "querystring"`, which the 3.1 types predate
type TestParameter =
	| oas31.ParameterObject
	| {
			name: string;
			in: "querystring";
			content: oas31.ParameterObject["content"];
	  };

async function serverFor(name: string, parameters: readonly TestParameter[]) {
	const document: oas31.OpenAPIObject = {
		openapi: "3.1.0",
		info: { title: "Test", version: "1.0.0" },
		paths: {
			"/things": {
				get: {
					operationId: "listThingsCommand",
					// TYPESAFETY: `TestParameter` widens the 3.1 union by the one 3.2
					// location these tests exercise, and the generator reads `in` as a
					// string
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

	const outputDir = join(generatedRoot, name);
	const result = await processOpenApiDocument(outputDir, document);

	await rm(outputDir, { recursive: true, force: true });
	await mkdir(outputDir, { recursive: true });
	await Promise.all([result.honoFile.save(), result.valibotFile.save()]);

	// TYPESAFETY: a dynamic import is typed `any`, and the code below picks the
	// one array export by inspection
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

	// TYPESAFETY: the generator emits one array export per operation, and the
	// `toBeDefined` above fails the test before this runs if it is missing
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

// deepObject expresses a collision that the default style flattens away
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

// Member placement comes from the document alone, so an undeclared style is
// worth saying out loud
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

// Two such parameters read alike once their members lose the parent name, and
// every encoding this generator could pick keeps them alike
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

async function warningsFrom(parameters: readonly TestParameter[]) {
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
// before both sides confidently produce something different
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

// `in: "querystring"` matches no branch in the parameter loop, so a warning
// is what keeps the operation from silently losing its query
test("an in: querystring parameter is warned about rather than dropped in silence", async () => {
	const warning = await warningsFrom([
		{
			name: "whole",
			in: "querystring",
			content: { "application/json": { schema: { type: "object" } } },
		},
	]);

	expect(warning).toContain("uses `in: querystring`");
});
