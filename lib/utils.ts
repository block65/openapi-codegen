import camelcase from 'camelcase';
import type { OpenAPIV3_1 } from 'openapi-types';
import wrap from 'word-wrap';

export function maybeJsDocDescription(
  ...str: (string | undefined | false | null)[]
): string {
  return str.length > 0 ? ['', ...str].filter(Boolean).join(' - ').trim() : '';
}

export function isReferenceObject(
  obj: unknown,
): obj is OpenAPIV3_1.ReferenceObject {
  return typeof obj === 'object' && obj !== null && '$ref' in obj;
}

export function getDependency(obj: unknown): string | undefined {
  return isReferenceObject(obj) ? obj.$ref : undefined;
}

export function isNotReferenceObject<
  T extends OpenAPIV3_1.ReferenceObject | unknown,
>(obj: T): obj is Exclude<T, OpenAPIV3_1.ReferenceObject> {
  return !isReferenceObject(obj);
}

export function isNotNullOrUndefined<T>(obj: T | null | undefined): obj is T {
  return obj !== null && typeof obj !== undefined;
}

export function getDependents(
  obj: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject,
): string[] {
  const strOnly = (x: string | undefined): x is string => typeof x === 'string';

  if (isReferenceObject(obj)) {
    return [getDependency(obj)].filter(strOnly);
  }

  if ('properties' in obj) {
    const properties = Object.values(obj.properties);
    return properties.flatMap(getDependents).filter(strOnly);
  }

  if ('items' in obj) {
    if (isReferenceObject(obj.items)) {
      return [getDependency(obj.items)].filter(strOnly);
    }
  }

  if ('anyOf' in obj) {
    return obj.anyOf.flatMap(getDependents).filter(strOnly);
  }

  if ('allOf' in obj) {
    return obj.allOf.flatMap(getDependents).filter(strOnly);
  }

  if ('oneOf' in obj) {
    return obj.oneOf.flatMap(getDependents).filter(strOnly);
  }

  return [];
}

export function refToName(ref: string): string {
  const name = ref.split('/').at(-1);
  if (!name) {
    throw new Error(`invalid ref: ${ref}`);
  }
  return name;
}

export function pascalCase(...str: string[]): string {
  return camelcase(str, { pascalCase: true });
}

export function wordWrap(text: string) {
  // max width is 75 as it will be indented already inside a multi-line comment
  return wrap(text, { width: 75, indent: '' });
}

export function castToValidJsIdentifier(name: string) {
  return name.replace(/^(\d+)/, '_$1').replaceAll(/[^a-zA-Z0-9_]/g, '');
}

export function iife<T>(fn: () => T): T {
  return fn();
}
