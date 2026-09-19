import { join } from "node:path";
import camelcase from "camelcase";
import type { Project, SourceFile } from "ts-morph";
import { VariableDeclarationKind } from "ts-morph";

/**
 * `hasQueryValidator` controls whether the query decoder is emitted.
 * `fixUnusedIdentifiers` would drop the unused entry point and strand the
 * helpers it called
 */
export function createHonoFile(
	project: Project,
	outputDir: string,
	hasQueryValidator: boolean,
): SourceFile {
	const file = project.createSourceFile(join(outputDir, "hono.ts"), "", {
		overwrite: true,
	});

	file.addImportDeclaration({
		moduleSpecifier: "hono/validator",
		namedImports: ["validator"],
	});

	file.addImportDeclaration({
		moduleSpecifier: "@standard-schema/spec",
		namedImports: ["StandardSchemaV1"],
		isTypeOnly: true,
	});

	file.addImportDeclaration({
		moduleSpecifier: "@block65/rest-client",
		namedImports: ["PublicValidationError"],
	});

	file.addFunction({
		name: "standardParse",
		isAsync: true,
		typeParameters: [{ name: "TSchema", constraint: "StandardSchemaV1" }],
		parameters: [
			{ name: "schema", type: "TSchema" },
			{ name: "value", type: "unknown" },
		],
		statements: `
      const result = await schema["~standard"].validate(value);
      if (result.issues) {
        throw PublicValidationError.fromIssues(result.issues);
      }
      return result.value;
    `,
	});

	if (hasQueryValidator) {
		addQueryDecoder(file);
	}

	return file;
}

// Inverts the OAS 3.2 §4.12.6 style table to decode Hono's flat query map
function addQueryDecoder(file: SourceFile): void {
	file.addStatements(`
type QueryParamSpec = {
  readonly name: string;
  readonly type: "object" | "array";
  readonly style: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  readonly explode: boolean;
  readonly members?: readonly string[];
};

// deepObject has no delimiter: §4.12.6 gives it bracket keys, and 3.2 drops
// \`explode\` from that row entirely, so it never reaches splitJoined.
const queryDelimiters = {
  form: ",",
  spaceDelimited: " ",
  pipeDelimited: "|",
} as const;

// Deep enough for any nesting an OpenAPI query parameter realistically
// declares, and bounded so a hostile key cannot make us build an arbitrarily
// deep tree. Past it the key is left alone rather than silently truncated.
const queryMaxDepth = 8;

// The bracket run that follows a deepObject parameter's name: balanced,
// non-empty groups and nothing else. An empty group (\`a[]\`) is not something
// the encoder emits, and is a real parameter name in OpenAI's document
// ("project_ids[]") where the brackets belong to the name rather than to
// structure.
//
// §4.12.3 defines deepObject for objects with scalar properties only - "the
// representation of array or object properties is not defined" - so everything
// past the first segment is a deliberate local extension, a superset of what
// the spec defines rather than a reading of it.
const queryBracketsPattern = /^(?:\\[[^[\\]]*\\])+$/;

function queryKeyPath(brackets: string): string[] | undefined {
  if (!queryBracketsPattern.test(brackets)) {
    return undefined;
  }

  const segments = brackets.slice(1, -1).split("][");

  return segments.length > queryMaxDepth || segments.some((segment) => !segment)
    ? undefined
    : segments;
}

function isQueryNode(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Nodes are created without a prototype so that a segment named \`__proto__\` is
// an ordinary member rather than a way to reach Object.prototype.
function queryNode(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}

function placeQueryValue(
  root: Record<string, unknown>,
  path: string[],
  value: unknown,
): boolean {
  let node = root;

  for (const segment of path.slice(0, -1)) {
    const next = node[segment];

    if (next === undefined) {
      const created = queryNode();
      node[segment] = created;
      node = created;
    } else if (isQueryNode(next)) {
      node = next;
    } else {
      // a value already sits where a container is needed
      return false;
    }
  }

  const leaf = path[path.length - 1] as string;

  if (leaf in node) {
    return false;
  }

  node[leaf] = value;
  return true;
}

// The encoder indexes an array densely from 0 and indexes nothing else, so a
// complete 0-based run of keys reads back as an array. A member genuinely named
// "0" is indistinguishable from an index and becomes one too; the encoding
// carries nothing that could tell them apart.
function queryNodeToValue(node: Record<string, unknown>): unknown {
  const keys = Object.keys(node);

  for (const key of keys) {
    const child = node[key];
    if (isQueryNode(child)) {
      node[key] = queryNodeToValue(child);
    }
  }

  return keys.length > 0 && keys.every((key, index) => key === String(index))
    ? keys.map((key) => node[key])
    : node;
}

// Any key that cannot be placed faithfully is left exactly as it arrived, where
// a strict schema rejects it by name. Nothing is dropped and no structure is
// invented.
function decodeDeepObject(
  result: Record<string, unknown>,
  name: string,
): void {
  // the parameter also arriving bare means it cannot be a container as well
  if (name in result) {
    return;
  }

  const root = queryNode();
  let placed = false;

  for (const key of Object.keys(result)) {
    if (!key.startsWith(\`\${name}[\`)) {
      continue;
    }

    const path = queryKeyPath(key.slice(name.length));

    if (path && placeQueryValue(root, path, result[key])) {
      delete result[key];
      placed = true;
    }
  }

  if (placed) {
    result[name] = queryNodeToValue(root);
  }
}

// form/explode sends an object's members as top-level keys with the parent name
// dropped, so only the member names the document declares can put it back
// together.
function hoistObject(
  result: Record<string, unknown>,
  name: string,
  members: readonly string[],
): void {
  const node: Record<string, unknown> = {};
  let found = false;

  for (const member of members) {
    if (member in result) {
      node[member] = result[member];
      delete result[member];
      found = true;
    }
  }

  // an absent parameter stays absent rather than becoming an empty object
  if (found) {
    result[name] = node;
  }
}

// explode: false puts the whole parameter in one value - an array as its items,
// an object as alternating member name and member value. A trailing name with
// no value is dropped.
function splitJoined(
  result: Record<string, unknown>,
  spec: QueryParamSpec,
  delimiter: string,
): void {
  const value = result[spec.name];

  if (value === undefined) {
    return;
  }

  const parts = (Array.isArray(value) ? value : [value]).flatMap((part) =>
    String(part).split(delimiter),
  );

  if (spec.type === "array") {
    result[spec.name] = parts;
    return;
  }

  const node: Record<string, unknown> = {};

  for (let index = 0; index + 1 < parts.length; index += 2) {
    node[parts[index] as string] = parts[index + 1];
  }

  result[spec.name] = node;
}

function parseQuery(
  query: Record<string, string | string[]>,
  specs: readonly QueryParamSpec[],
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...query };

  for (const spec of specs) {
    if (spec.style === "deepObject") {
      decodeDeepObject(result, spec.name);
    } else if (!spec.explode) {
      splitJoined(result, spec, queryDelimiters[spec.style]);
    } else if (spec.type === "array") {
      // a single occurrence reaches us as a bare string, not a one-item list
      const value = result[spec.name];
      if (value !== undefined && !Array.isArray(value)) {
        result[spec.name] = [value];
      }
    } else {
      hoistObject(result, spec.name, spec.members ?? []);
    }
  }

  return result;
}
`);
}

export type QueryParamSpec = {
	name: string;
	type: "object" | "array";
	style: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
	explode: boolean;
	members?: string[];
};

export function createHonoMiddleware(
	honoFile: SourceFile,
	exportName: string,
	schemas: {
		json?: string;
		response?: string;
		param?: string;
		query?: string;
		header?: string;
	},
	queryParams: QueryParamSpec[] = [],
): void {
	const name = camelcase(exportName);

	// A parameter beyond a plain scalar needs a spec. A scalar reaches the
	// validator as the string it was sent as, under every style
	if (schemas.query && queryParams.length > 0) {
		honoFile.addVariableStatement({
			declarationKind: VariableDeclarationKind.Const,
			declarations: [
				{
					name: `${name}QueryParams`,
					initializer: `${JSON.stringify(queryParams)} as const satisfies readonly QueryParamSpec[]`,
				},
			],
		});
	}

	honoFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name,
				initializer: (writer) => {
					writer.write("[");
					writer.indent(() => {
						// Hono validators run on inbound request data alone. Response
						// schemas are emitted for client-side consumption, and `header`
						// is skipped so extra HTTP headers pass
						for (const [target, schemaName] of Object.entries(schemas).filter(
							([t]) => t !== "header" && t !== "response",
						)) {
							const value =
								target === "query" && queryParams.length > 0
									? `parseQuery(value, ${name}QueryParams)`
									: "value";
							writer.writeLine(
								`validator(${JSON.stringify(target)}, (value) => standardParse(${schemaName}, ${value})),`,
							);
						}
					});
					writer.write("] as const");
				},
			},
		],
	});
}

export function addSchemaImportsToHonoFile(
	honoFile: SourceFile,
	schemaNames: string[],
): void {
	if (schemaNames.length === 0) {
		return;
	}

	honoFile.addImportDeclaration({
		moduleSpecifier: "./valibot.js",
		namedImports: schemaNames.toSorted(),
	});
}
