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
export function isNotReferenceObject<
  T extends OpenAPIV3_1.ReferenceObject | unknown,
>(obj: T): obj is Exclude<T, OpenAPIV3_1.ReferenceObject> {
  return !isReferenceObject(obj);
}
export function schemaIsOrHasReferenceObject(
  a: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject,
): boolean {
  return (
    isReferenceObject(a) ||
    ('properties' in a &&
      Object.values(a.properties).some(schemaIsOrHasReferenceObject)) ||
    ('items' in a && isReferenceObject(a.items)) ||
    ('anyOf' in a && a.anyOf.some(schemaIsOrHasReferenceObject)) ||
    ('allOf' in a && a.allOf.some(schemaIsOrHasReferenceObject)) ||
    ('oneOf' in a && a.oneOf.some(schemaIsOrHasReferenceObject))
  );
}

export function schemaIsOrHasReferenceObjectsExclusively(
  a: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject,
): boolean {
  return (
    isReferenceObject(a) ||
    ('properties' in a &&
      Object.values(a.properties).every(schemaIsOrHasReferenceObject)) ||
    ('items' in a && isReferenceObject(a.items)) ||
    ('anyOf' in a && a.anyOf.every(schemaIsOrHasReferenceObject)) ||
    ('allOf' in a && a.allOf.every(schemaIsOrHasReferenceObject)) ||
    ('oneOf' in a && a.oneOf.every(schemaIsOrHasReferenceObject))
  );
}

export function refToName(ref: string): string {
  const name = ref.split('/').at(-1);
  if (!name) {
    throw new Error(`invalid ref: ${ref}`);
  }
  return name;
}

export function pascalCase(str: string): string {
  return camelcase(str, { pascalCase: true });
}

export function wordWrap(text: string) {
  // max width is 75 as it will be indented already inside a multi-line comment
  return wrap(text, { width: 75, indent: '' });
}
