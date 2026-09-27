const componentSchemas = "#/components/schemas/";

/**
 * Keys a component schema by the $ref that names it. A name holding `~` or
 * `/` is escaped the way a JSON pointer writes it
 */
export function schemaRef(schemaName: string) {
	return `${componentSchemas}${schemaName.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

// a `$ref` key inside these is data, unless the key names a property
const dataKeywords = new Set([
	"example",
	"examples",
	"default",
	"const",
	"enum",
]);

const nameMapKeywords = new Set([
	"schemas",
	"properties",
	"patternProperties",
	"dependentSchemas",
	"$defs",
	"definitions",
]);

function decodeFragment(ref: string) {
	try {
		return decodeURIComponent(ref);
	} catch {
		return ref;
	}
}

function pointerTokens(ref: string) {
	return ref
		.slice(2)
		.split("/")
		.map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
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

/**
 * Leaves only $refs the generator can look up. A percent-encoded ref is
 * decoded. A ref into part of a component schema is replaced by that
 * subschema, so each schema ref left names a whole component
 */
export function normalizeRefs<T>(document: T): T {
	const visit = (
		node: unknown,
		inNameMap: boolean,
		inlining: string[],
	): unknown => {
		if (Array.isArray(node)) {
			return node.map((item) => visit(item, false, inlining));
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

			if (!intoComponent) {
				return { ...node, $ref: ref };
			}

			if (inlining.includes(ref)) {
				throw new Error(`${ref} refers into itself, so it cannot be inlined`);
			}

			const target = lookup(document, ref);

			const inlined = visit(target, false, [...inlining, ref]);
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
								visit(value, false, inlining),
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
					: visit(value, !inNameMap && nameMapKeywords.has(key), inlining),
			]),
		);
	};

	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- visit rebuilds the same shape and changes only $ref values
	return visit(document, false, []) as T;
}
