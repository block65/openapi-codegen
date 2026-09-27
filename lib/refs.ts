import type { oas32 } from "openapi3-ts";
import type { SchemaKeyword } from "./utils.ts";

const componentSchemas = "#/components/schemas/";

/**
 * Keys a component schema by the $ref that names it. A name holding `~` or
 * `/` is escaped the way a JSON pointer writes it
 */
export function schemaRef(schemaName: string) {
	return `${componentSchemas}${escapeToken(schemaName)}`;
}

/**
 * Recovers a component's name from a whole-component $ref, once refs are
 * normalized
 */
export function schemaNameOf(ref: string) {
	return unescapeToken(ref.slice(componentSchemas.length));
}

function escapeToken(token: string) {
	return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

// a `$ref` key inside these is data, unless the key names a property
const dataKeywords: ReadonlySet<string> = new Set([
	"example",
	"examples",
	"default",
	"const",
	"enum",
] as const satisfies readonly SchemaKeyword[]);

// components.schemas, and the schema keywords that map names to subschemas
const nameMapKeywords: ReadonlySet<string> = new Set([
	"schemas",
	"properties",
	"patternProperties",
	"dependentSchemas",
	"$defs",
] as const satisfies readonly (keyof oas32.ComponentsObject | SchemaKeyword)[]);

function decodeFragment(ref: string) {
	try {
		return decodeURIComponent(ref);
	} catch {
		return ref;
	}
}

function unescapeToken(token: string) {
	return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

function pointerTokens(ref: string) {
	return ref
		.slice(2)
		.split("/")
		.map((token) => unescapeToken(token));
}

function lookup(document: unknown, ref: string) {
	let node = document;

	for (const token of pointerTokens(ref)) {
		if (
			typeof node !== "object" ||
			node === null ||
			!Object.hasOwn(node, token)
		) {
			throw new Error(`${ref} does not point at a schema in the document`);
		}

		node = Reflect.get(node, token);
	}

	return node;
}

export type Refs = { get(ref: string): unknown };

/**
 * Looks up $refs inside the document. A ref to another file or a URL is
 * refused, which keeps generation to the one document it is given
 */
export function localRefs(document: unknown): Refs {
	return {
		get: (ref) => {
			if (!ref.startsWith("#")) {
				throw new Error(
					`${ref} is not in the document, and only local refs are read`,
				);
			}

			return lookup(document, ref);
		},
	};
}

/**
 * Leaves only $refs the generator can look up. A percent-encoded ref is
 * decoded. A ref into part of a component schema is replaced by that
 * subschema, so each schema ref left names a whole component
 */
export function normalizeRefs(document: oas32.OpenAPIObject) {
	const schemas = document.components?.schemas ?? {};

	const visit = (
		node: unknown,
		inNameMap: boolean,
		inlining: string[],
		at: string,
	): unknown => {
		if (Array.isArray(node)) {
			return node.map((item, index) =>
				visit(item, false, inlining, `${at}/${index}`),
			);
		}

		if (typeof node !== "object" || node === null) {
			return node;
		}

		if (!inNameMap && "$ref" in node && typeof node.$ref === "string") {
			const ref = node.$ref.startsWith("#")
				? decodeFragment(node.$ref)
				: node.$ref;
			const intoComponent =
				ref.startsWith(componentSchemas) &&
				ref.slice(componentSchemas.length).includes("/");

			const defined =
				!ref.startsWith(componentSchemas) ||
				intoComponent ||
				Object.hasOwn(
					schemas,
					unescapeToken(ref.slice(componentSchemas.length)),
				);

			// the generator looks the name up much later, and far from here
			if (!defined) {
				throw new Error(
					`${at} refers to ${ref}, which is not a schema in components.schemas`,
				);
			}

			if (!intoComponent) {
				return { ...node, $ref: ref };
			}

			if (inlining.includes(ref)) {
				throw new Error(`${ref} refers into itself, so it cannot be inlined`);
			}

			const target = lookup(document, ref);

			const inlined = visit(target, false, [...inlining, ref], ref);
			const { $ref: _, ...siblings } = node;

			// OAS 3.1 allows keywords such as description beside a $ref
			return typeof inlined === "object" &&
				inlined !== null &&
				Object.keys(siblings).length > 0
				? {
						...inlined,
						...Object.fromEntries(
							Object.entries(siblings).map(([key, value]) => [
								key,
								visit(value, false, inlining, `${at}/${escapeToken(key)}`),
							]),
						),
					}
				: inlined;
		}

		return Object.fromEntries(
			Object.entries(node).map(([key, value]) => [
				key,
				!inNameMap && dataKeywords.has(key)
					? value
					: visit(
							value,
							!inNameMap && nameMapKeywords.has(key),
							inlining,
							`${at}/${escapeToken(key)}`,
						),
			]),
		);
	};

	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- visit rebuilds the same shape and changes only $ref values
	return visit(document, false, [], "#") as oas32.OpenAPIObject;
}
