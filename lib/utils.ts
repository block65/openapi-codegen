import camelcase from "camelcase";
import type { oas30, oas32 } from "openapi3-ts";
import wrap from "word-wrap";

export type SchemaObject = oas30.SchemaObject | oas32.SchemaObjectValue;

export type ReferenceObject = oas30.ReferenceObject | oas32.ReferenceObject;

// JSON Schema 2020-12, which OAS 3.1 and 3.2 use, also allows true and false
export type SchemaNode = SchemaObject | ReferenceObject | boolean;

export function isReferenceObject(obj: unknown): obj is ReferenceObject {
	return typeof obj === "object" && obj !== null && "$ref" in obj;
}

export function isSchemaObject(node: SchemaNode): node is SchemaObject {
	return typeof node === "object" && !isReferenceObject(node);
}

export function isNotNullOrUndefined<T>(obj: T | null | undefined): obj is T {
	return obj !== null && obj !== undefined;
}

// each keyword holds a subschema, or an array of them
const subschemaKeywords = new Set([
	"items",
	"prefixItems",
	"additionalItems",
	"additionalProperties",
	"unevaluatedItems",
	"unevaluatedProperties",
	"propertyNames",
	"contains",
	"not",
	"if",
	"then",
	"else",
	"allOf",
	"anyOf",
	"oneOf",
]);

// each keyword maps names to subschemas
const subschemaMapKeywords = new Set([
	"properties",
	"patternProperties",
	"dependentSchemas",
	"$defs",
	"definitions",
]);

/**
 * Every $ref a schema depends on, at any depth. Only subschemas count. An
 * example, default, const or enum is data, and a `$ref` key inside it is not
 * a reference
 */
export function getDependents(schema: unknown): string[] {
	if (isReferenceObject(schema)) {
		return [schema.$ref];
	}

	if (typeof schema !== "object" || schema === null) {
		return [];
	}

	const entries = Object.entries(schema);

	return [
		...entries
			.filter(([keyword]) => subschemaKeywords.has(keyword))
			.flatMap(([, value]) =>
				Array.isArray(value)
					? value.flatMap((item) => getDependents(item))
					: getDependents(value),
			),
		...entries
			.filter(([keyword]) => subschemaMapKeywords.has(keyword))
			.flatMap(([, value]) =>
				typeof value === "object" && value !== null
					? Object.values(value).flatMap((item) => getDependents(item))
					: [],
			),
	];
}

// a schema name can hold `/`, `~` or other characters an identifier cannot
const nonIdentifier = /[^\p{L}\p{N}_$]+/u;

export function camelCase(...str: string[]): string {
	return camelcase(str.flatMap((s) => s.split(nonIdentifier)));
}

export function pascalCase(...str: string[]): string {
	return camelcase(
		str.flatMap((s) => s.split(nonIdentifier)),
		{ pascalCase: true },
	);
}

export function wordWrap(text: string) {
	// max width is 75 as it will be indented already inside a multi-line comment
	return wrap(text, { width: 75, indent: "" });
}

export function castToValidJsIdentifier(name: string) {
	return name.replace(/^(\d+)/, "_$1").replaceAll(/[^a-zA-Z0-9_]/g, "");
}

export function iife<T>(fn: () => T): T {
	return fn();
}

/**
 * `Object.entries` types every key as `string`, and this puts back what `T`
 * declares. An index signature on `T` would widen them again, and every caller
 * passes a closed object type
 */
export function typedEntries<T extends object>(obj: T) {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.entries widens every key to string, and restoring what T declares is the whole purpose here
	return Object.entries(obj) as [keyof T, T[keyof T]][];
}
