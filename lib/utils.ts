import camelcase from "camelcase";
import type { oas31 } from "openapi3-ts";
import wrap from "word-wrap";

export function isReferenceObject(obj: unknown): obj is oas31.ReferenceObject {
	return typeof obj === "object" && obj !== null && "$ref" in obj;
}

function getDependency(obj: unknown) {
	return isReferenceObject(obj) ? obj.$ref : undefined;
}

export function isNotReferenceObject<T>(
	obj: T,
): obj is Exclude<T, oas31.ReferenceObject> {
	return !isReferenceObject(obj);
}

export function isNotNullOrUndefined<T>(obj: T | null | undefined): obj is T {
	return obj !== null && obj !== undefined;
}

function isString(x: string | undefined): x is string {
	return typeof x === "string";
}

export function getDependents(
	obj: oas31.ReferenceObject | oas31.SchemaObject,
): string[] {
	if (isReferenceObject(obj)) {
		return [getDependency(obj)].filter((value) => isString(value));
	}

	if ("properties" in obj) {
		const properties = Object.values(obj.properties);

		return properties
			.flatMap((value) => getDependents(value))
			.filter((value) => isString(value));
	}

	if ("items" in obj && isReferenceObject(obj.items)) {
		return [getDependency(obj.items)].filter((value) => isString(value));
	}

	if ("anyOf" in obj) {
		return obj.anyOf
			.flatMap((value) => getDependents(value))
			.filter((value) => isString(value));
	}

	if ("allOf" in obj) {
		return obj.allOf
			.flatMap((value) => getDependents(value))
			.filter((value) => isString(value));
	}

	if ("oneOf" in obj) {
		return obj.oneOf
			.flatMap((value) => getDependents(value))
			.filter((value) => isString(value));
	}

	return [];
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
