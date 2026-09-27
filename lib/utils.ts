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

/**
 * Every $ref anywhere under a schema. Items, additionalProperties and
 * combinators nest them at any depth, and a schema registers after all of them
 */
export function getDependents(obj: unknown): string[] {
	if (isReferenceObject(obj)) {
		return [obj.$ref];
	}

	if (typeof obj !== "object" || obj === null) {
		return [];
	}

	return Object.values(obj).flatMap((value) => getDependents(value));
}

export function camelCase(...str: string[]): string {
	return camelcase(str.flatMap((s) => s.split("/")));
}

export function pascalCase(...str: string[]): string {
	return camelcase(
		str.flatMap((s) => s.split("/")),
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
