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

function strOnly(x: string | undefined): x is string {
	return typeof x === "string";
}

export function getDependents(
	obj: oas31.ReferenceObject | oas31.SchemaObject,
): string[] {
	if (isReferenceObject(obj)) {
		return [getDependency(obj)].filter(strOnly);
	}

	if ("properties" in obj) {
		const properties = Object.values(obj.properties);

		return properties.flatMap(getDependents).filter(strOnly);
	}

	if ("items" in obj) {
		if (isReferenceObject(obj.items)) {
			return [getDependency(obj.items)].filter(strOnly);
		}
	}

	if ("anyOf" in obj) {
		return obj.anyOf.flatMap(getDependents).filter(strOnly);
	}

	if ("allOf" in obj) {
		return obj.allOf.flatMap(getDependents).filter(strOnly);
	}

	if ("oneOf" in obj) {
		return obj.oneOf.flatMap(getDependents).filter(strOnly);
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

export function typedEntries<T extends object>(
	obj: T,
): [keyof T & string, T[keyof T]][] {
	// TYPESAFETY: `Object.entries` types every key as `string`, and this puts
	// back what `T` declares. An index signature on `T` would widen them again,
	// and every caller passes a closed object type
	return Object.entries(obj) as [keyof T & string, T[keyof T]][];
}
