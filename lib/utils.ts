import camelcase from 'camelcase';
import type { OpenAPIV3 } from 'openapi-types';

export function maybeJsDocDescription(
  ...str: (string | undefined | false | null)[]
): string {
  return str.length > 0 ? ['', ...str].filter(Boolean).join(' - ').trim() : '';
}

export function isReferenceObject(
  obj: unknown,
): obj is OpenAPIV3.ReferenceObject {
  return typeof obj === 'object' && obj !== null && '$ref' in obj;
}
export function isNotReferenceObject<
  T extends OpenAPIV3.ReferenceObject | unknown,
>(obj: T): obj is Exclude<T, OpenAPIV3.ReferenceObject> {
  return !isReferenceObject(obj);
}
export function schemaIsOrSchemaHasReferenceObject(
  a: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
): boolean {
  return (
    isReferenceObject(a) ||
    ('properties' in a &&
      Object.values(a.properties).some(schemaIsOrSchemaHasReferenceObject)) ||
    ('anyOf' in a && a.anyOf.some(schemaIsOrSchemaHasReferenceObject)) ||
    ('allOf' in a && a.allOf.some(schemaIsOrSchemaHasReferenceObject)) ||
    ('oneOf' in a && a.oneOf.some(schemaIsOrSchemaHasReferenceObject))
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
