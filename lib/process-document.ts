import nodePath from "node:path";
import type { oas30, oas32 } from "openapi3-ts";
import toposort from "toposort";
import {
	type ClassDeclaration,
	type ImportDeclaration,
	type InterfaceDeclaration,
	type JSDocStructure,
	Node,
	type OptionalKind,
	Project,
	Scope,
	type SourceFile,
	StructureKind,
	SyntaxKind,
	type TypeAliasDeclaration,
	VariableDeclarationKind,
	type WriterFunction,
	Writers,
} from "ts-morph";
import type { Simplify } from "type-fest";
import { chunkOf, joinChunks } from "./chunks.ts";
import {
	addSchemaImportsToHonoFile,
	createHonoFile,
	createHonoMiddleware,
	type QueryParamSpec,
	queryStyles,
} from "./hono.ts";
import { registerTypesFromSchema, schemaToType } from "./process-schema.ts";
import { localRefs, normalizeRefs, type Refs, schemaRef } from "./refs.ts";
import {
	type ReferenceObject,
	type SchemaNode,
	type SchemaObject,
	camelCase,
	castToValidJsIdentifier,
	getDependents,
	iife,
	isReferenceObject,
	isSchemaObject,
	pascalCase,
	typedEntries,
	wordWrap,
} from "./utils.ts";
import {
	createValibotFile,
	createValidatorForOperationInput,
	declareValidator,
	importLazyTypes,
	type ValidatorEntry,
	registerValidatorFromSchema,
	addJsonValueSchemaWhenUsed,
} from "./valibot.ts";

export type CodegenOptions = {
	/**
	 * Emit only `input*` variants, which use `v.optional` and skip wire
	 * coercion. Suits consumers that stay in memory and never reach hono
	 * middleware or response parsing
	 */
	inputOnly?: boolean;
};

type OperationMiddlewareInfo = {
	exportName: string;
	schemas: {
		json?: string;
		response?: string;
		param?: string;
		query?: string;
		header?: string;
	};
	queryParams: QueryParamSpec[];
};

function isQueryStyle(style: string): style is QueryParamSpec["style"] {
	return Object.hasOwn(queryStyles, style);
}

// Resolves the OAS 3.2 §4.12.6 style and explode defaults for a parameter
function queryParameterEncoding(parameter: oas30.ParameterObject) {
	// OpenAPI defaults `style` to `form`, and `explode` to true for `form` and
	// false elsewhere. OAS 3.2 marks `explode` n/a for `deepObject`, so it is
	// normalised to true here and both sides of the generated code ignore it
	const style =
		parameter.style !== undefined && isQueryStyle(parameter.style)
			? parameter.style
			: "form";

	return {
		style,
		explode:
			style === "deepObject" ? true : (parameter.explode ?? style === "form"),
		declared: parameter.style !== undefined || parameter.explode !== undefined,
	};
}

// OAS 3.2 added this location, which the 3.0 union omits
// oxlint-disable-next-line block65/no-single-use-function -- the widened parameter is what lets the one call site compare against a location the 3.0 union omits
function isQuerystringLocation(location: string) {
	return location === "querystring";
}

function queryParameterSpec(parameter: oas30.ParameterObject) {
	const schema: oas30.SchemaObject =
		parameter.schema !== undefined && !("$ref" in parameter.schema)
			? parameter.schema
			: {};
	const { style, explode } = queryParameterEncoding(parameter);

	if (schema.type === "array") {
		return {
			name: parameter.name,
			type: "array",
			style,
			explode,
		} satisfies QueryParamSpec;
	}

	if (schema.type === "object" || schema.properties) {
		return {
			name: parameter.name,
			type: "object",
			style,
			explode,
			members: Object.keys(schema.properties ?? {}),
		} satisfies QueryParamSpec;
	}

	// a scalar arrives as the string it was sent as, under every style
	return;
}

// OAS 3.2 §4.12.6 marks these n/a, for every type of query parameter
function assertSupportedEncoding(
	operationId: string,
	name: string,
	style: QueryParamSpec["style"],
	explode: boolean,
) {
	if ((style === "spaceDelimited" || style === "pipeDelimited") && explode) {
		throw new Error(
			`${operationId}: query parameter "${name}" combines \`style: ${style}\` with \`explode: true\`, which OpenAPI marks n/a and leaves undefined. Set \`explode: false\`, or use \`style: form\`.`,
		);
	}
}

function assertSupportedCombination(operationId: string, spec: QueryParamSpec) {
	if (spec.style === "deepObject" && spec.type === "array") {
		throw new Error(
			`${operationId}: query parameter "${spec.name}" is an array with \`style: deepObject\`, which OpenAPI marks n/a and leaves undefined. Use \`style: form\`.`,
		);
	}
}

// Rejects an encoding the generator cannot emit, warns on a risky one
function checkQueryParameters(
	operationId: string,
	parameters: oas30.ParameterObject[],
) {
	const seen = new Map<string, string>();

	for (const parameter of parameters) {
		if (parameter.style !== undefined && !isQueryStyle(parameter.style)) {
			throw new Error(
				`${operationId}: query parameter "${parameter.name}" declares \`style: ${parameter.style}\`, which rest-client does not encode. Use one of ${typedEntries(
					queryStyles,
				)
					.map(([style]) => style)
					.join(", ")}.`,
			);
		}

		const encoding = queryParameterEncoding(parameter);

		assertSupportedEncoding(
			operationId,
			parameter.name,
			encoding.style,
			encoding.explode,
		);

		const spec = queryParameterSpec(parameter);

		if (spec) {
			assertSupportedCombination(operationId, spec);
		}

		if (spec?.type !== "object") {
			continue;
		}

		if (!queryParameterEncoding(parameter).declared) {
			console.warn(
				`${operationId}: query parameter "${parameter.name}" is an object but declares no \`style\`, so OpenAPI's default (form, explode) applies and its members are sent without the "${parameter.name}" prefix. Declare \`style: deepObject\` if the server expects ${parameter.name}[member]=value.`,
			);
		}

		for (const member of spec.members ?? []) {
			const owner = seen.get(member);

			if (owner) {
				console.warn(
					`${operationId}: query parameters "${owner}" and "${parameter.name}" both send a member named "${member}" without the parent name, so the request cannot be read back unambiguously. Declare \`style: deepObject\` on both.`,
				);
			} else {
				seen.set(member, parameter.name);
			}
		}
	}
}

const neverKeyword = "never" as const;

// A resolved $ref is typed unknown, and every parameter declares name and in
function isParameterObject(value: unknown): value is oas30.ParameterObject {
	return (
		typeof value === "object" &&
		value !== null &&
		"in" in value &&
		"name" in value
	);
}

const unspecifiedKeyword = "unknown" as const;
function isUnspecifiedKeyword(type: TypeAliasDeclaration) {
	return type?.getTypeNode()?.getKindName() === unspecifiedKeyword;
}

const emptyKeyword = "undefined" as const;

// the union/intersect helpers keep TypeScript happy due to ts-morph typings
function createIntersection(...types: (string | undefined)[]) {
	// create a type  of all the inputs
	const [type1, type2, ...typeX] = types.filter((t): t is string => !!t);
	return (
		(type1 && type2
			? Writers.intersectionType(type1, type2, ...typeX)
			: type1) || neverKeyword
	);
}

// the union/intersect helpers keep TypeScript happy due to ts-morph typings
function createUnion(...types: (string | undefined)[]) {
	// create a type  of all the inputs
	const [type1, type2, ...typeX] = [
		...new Set(types.filter((t): t is string => !!t)),
	].toSorted((a, b) => a.localeCompare(b));
	return (
		(type1 && type2 ? Writers.unionType(type1, type2, ...typeX) : type1) ||
		neverKeyword
	);
}

type NamedDeclaration = InterfaceDeclaration | TypeAliasDeclaration;

type DeprecationDocs = (OptionalKind<JSDocStructure> | string)[];

type OperationParameterObjects = {
	path: oas30.ParameterObject[];
	query: oas30.ParameterObject[];
	header: oas30.ParameterObject[];
};

type OperationContext = {
	commandName: string;
	commandClass: ClassDeclaration;
	deprecationDocs: DeprecationDocs;
	queryParameters: oas30.ParameterObject[];
	queryType: TypeAliasDeclaration | undefined;
	headerParameters: oas30.ParameterObject[];
	headerType: TypeAliasDeclaration | undefined;
	pathParameters: oas30.ParameterObject[];
	pathType: TypeAliasDeclaration | undefined;
	jsonRequestBodyObject: oas32.MediaTypeObject | undefined;
	jsonBodyType: NamedDeclaration | undefined;
	nonJsonBodyType: TypeAliasDeclaration | undefined;
	wrapJsonBody: boolean;
	inputType: TypeAliasDeclaration;
	inputTypeNode: string | WriterFunction;
};

type OperationWithId = oas32.OperationObject & { operationId: string };

type ValidatedSubclass = {
	commandName: string;
	field: "responseSchema" | "dataSchema";
	schema: string;
};

type SequentialMedia = {
	baseClass: string;

	// the type rest-client's stream() yields for an output type
	itemType: (output: string) => string;

	// the item property holding the content, as SSE's `data`. Without it, the
	// item is the content
	contentProperty?: string;
};

// media types rest-client splits into items, when they have an itemSchema
const sequentialMediaTypes: Readonly<Record<string, SequentialMedia>> = {
	"text/event-stream": {
		baseClass: "EventStreamCommand",
		itemType: (output) => `ParsedStreamEvent<${output}>`,
		contentProperty: "data",
	},
};

// a $ref resolves to the object it names, which the document must hold
function resolveObject<T extends object>(
	refs: Refs,
	node: T | ReferenceObject,
) {
	if (!isReferenceObject(node)) {
		return node;
	}

	const target = refs.get(node.$ref);

	if (!target || typeof target !== "object" || Array.isArray(target)) {
		throw new Error(`${node.$ref} does not resolve to an object`);
	}

	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the $ref names an object of the kind its position holds
	return target as T;
}

// OAS 3.2 lets a media type be a $ref, so a content map resolves before use
function resolveContent(refs: Refs, content: oas32.ContentObject | undefined) {
	return Object.fromEntries(
		Object.entries(content ?? {}).map(([mediaType, media]) => [
			mediaType,
			resolveObject(refs, media),
		]),
	);
}

type DataDecoding = {
	// a rest-client DataTransformer export. Without one, rest-client's
	// jsonDataTransformer applies
	transformer?: string;

	decodedSchema: (
		content: SchemaObject,
	) => oas32.SchemaObject | oas32.ReferenceObject | undefined;
};

// keyed by an item content's contentMediaType
const dataDecodings: Readonly<Record<string, DataDecoding>> = {
	"application/json": {
		decodedSchema: (content) =>
			"contentSchema" in content ? content.contentSchema : undefined,
	},
	"text/plain": {
		transformer: "textDataTransformer",
		decodedSchema: () => ({ type: "string" }),
	},
};

function hasOperationId(
	operationObject: oas32.OperationObject,
): operationObject is OperationWithId {
	return "operationId" in operationObject;
}

const nonJsonBodyPropName = "body";
const inputBodyName = "body";

function createOutputFiles(project: Project, outputDir: string) {
	const sourceFile = (name: string) =>
		project.createSourceFile(nodePath.join(outputDir, name), "", {
			overwrite: true,
		});

	return {
		commandsFile: sourceFile("commands.ts"),

		// Subclasses that attach `static responseSchema`. Consumers import from
		// this module to opt into runtime response validation, or alias
		// `./commands` to it in dev. The base command module imports zero
		// schemas, so prod bundles stay small
		commandsValidatedFile: sourceFile("commands-validated.ts"),
		typesFile: sourceFile("types.ts"),
		mainFile: sourceFile("main.ts"),
		enumsFile: sourceFile("enums.ts"),
		valibotFile: createValibotFile(project, outputDir),
	};
}

type OutputFiles = ReturnType<typeof createOutputFiles>;

type DocumentContext = OutputFiles & {
	refs: Refs;
	openapiVersion: string;
	typesImportDecl: ImportDeclaration;
	typesAndInterfaces: Map<string, NamedDeclaration>;
	validators: Map<string, ValidatorEntry>;
	allOperations: OperationMiddlewareInfo[];
	outputTypes: Set<NamedDeclaration | string>;
	inputTypeArgs: Set<string>;
	inputTypeNames: Set<string>;
	validatedSubclasses: ValidatedSubclass[];

	// apart from outputTypes, as AllOutputs takes the item type, not the alias
	sequentialOutputs: { output: string; item: string }[];
	validatedReExports: string[];
	inputOnly: boolean | undefined;
};

function typesModuleSpecifierOf(typesFile: SourceFile) {
	return `./${typesFile.getBaseNameWithoutExtension()}.js`;
}

function addModulePreambles({ commandsFile, typesFile }: OutputFiles) {
	commandsFile.addImportDeclaration({
		namedImports: [
			// command classes
			"Command",
			...Object.values(sequentialMediaTypes).map(({ baseClass }) => baseClass),
			...Object.values(dataDecodings)
				.map(({ transformer }) => transformer)
				.filter((transformer) => transformer !== undefined),
			"stripUndefined",
			"jsonStringify",
		],
		moduleSpecifier: "@block65/rest-client",
	});

	commandsFile.addFunction({
		name: "encodePath",
		docs: [
			{
				description: wordWrap(
					"Tagged template literal that applies encodeURIComponent to all interpolated values, protecting path integrity from characters like `/` and `#`.",
				),
				tags: [
					{
						tagName: "example",
						text: 'encodePath`/users/${userId}` // "/users/foo%2Fbar"',
					},
				],
			},
		],
		parameters: [
			{ name: "strings", type: "TemplateStringsArray" },
			{ name: "...values", type: "string[]" },
		],
		statements:
			"return String.raw({ raw: strings }, ...values.map((value) => encodeURIComponent(value)));",
	});

	commandsFile.addImportDeclaration({
		namedImports: ["Except", "Jsonifiable", "UndefinedOnPartialDeep"],
		moduleSpecifier: "type-fest",
		isTypeOnly: true,
	});

	typesFile.addImportDeclaration({
		namedImports: [
			"Jsonifiable",
			"Jsonify",
			"JsonValue",
			"LiteralUnion",
			"UndefinedOnPartialDeep",
		],
		moduleSpecifier: "type-fest",
		isTypeOnly: true,
	});

	const typesModuleSpecifier = typesModuleSpecifierOf(typesFile);

	return (
		commandsFile
			.getImportDeclaration(
				(decl) =>
					decl.getModuleSpecifier().getLiteralValue() === typesModuleSpecifier,
			)
			?.setIsTypeOnly(true) ||
		commandsFile.addImportDeclaration({
			moduleSpecifier: typesModuleSpecifier,
			namedImports: [],
		})
	);
}

function ensureTypeImport(
	typesImportDecl: ImportDeclaration,
	type: NamedDeclaration | undefined,
) {
	if (
		type &&
		!typesImportDecl
			.getNamedImports()
			.some((namedImport) => namedImport.getName() === type.getName())
	) {
		typesImportDecl.addNamedImport({ name: type.getName() });
		typesImportDecl.setIsTypeOnly(true);
	}
}

// a ref that closes a loop is emitted lazily, so it drops out of the order
function withoutCycles(edges: [string, string][]) {
	const next = Map.groupBy(edges, ([from]) => from);
	const open = new Set<string>();
	const done = new Set<string>();
	const closing = new Set<[string, string]>();

	const visit = (node: string) => {
		open.add(node);

		for (const edge of next.get(node) ?? []) {
			if (open.has(edge[1])) {
				closing.add(edge);
			} else if (!done.has(edge[1])) {
				visit(edge[1]);
			}
		}

		open.delete(node);
		done.add(node);
	};

	for (const [from] of edges) {
		if (!done.has(from)) {
			visit(from);
		}
	}

	return edges.filter((edge) => !closing.has(edge));
}

function sortedComponentSchemas(schema: oas32.OpenAPIObject) {
	const schemas = Object.entries(schema.components?.schemas || {});
	const defined = new Set(schemas.map(([schemaName]) => schemaRef(schemaName)));

	const schemaGraph = schemas.flatMap(([schemaName, schemaObject]) => {
		const deps = getDependents(schemaObject);
		const missing = deps.find((dep) => !defined.has(dep));

		if (missing) {
			throw new Error(
				`${schemaName} refers to ${missing}, which is not a schema in components.schemas`,
			);
		}

		// oxlint-disable-next-line block65/no-explicit-return-type -- inference widens the pair to string[], and toposort takes a mutable tuple
		return deps.map((dep): [string, string] => [schemaRef(schemaName), dep]);
	});

	const sorted = toposort(withoutCycles(schemaGraph)).toReversed();

	return schemas.toSorted(
		([a], [b]) => sorted.indexOf(schemaRef(a)) - sorted.indexOf(schemaRef(b)),
	);
}

// Add enum values to enums file
function addEnumValues(
	enumsFile: SourceFile,
	schemaName: string,
	schemaObject: SchemaNode,
) {
	if (
		!isSchemaObject(schemaObject) ||
		!("enum" in schemaObject) ||
		!Array.isArray(schemaObject.enum)
	) {
		return;
	}

	const values = schemaObject.enum.filter((v): v is string => v !== null);

	if (values.length === 0) {
		return;
	}

	enumsFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		docs: schemaObject.description
			? [
					{
						description: wordWrap(schemaObject.description),
						tags: (schemaObject.deprecated
							? [{ tagName: "deprecated" }]
							: []
						).filter(Boolean),
					},
				]
			: [],
		declarations: [
			{
				name: camelCase(schemaName),
				initializer: Writers.assertion((writer) => {
					writer.write("[");
					values.forEach((value, index) => {
						writer.write(JSON.stringify(value));
						if (index < values.length - 1) {
							writer.write(", ");
						}
					});
					writer.write("]");
				}, "const"),
			},
		],
	});
}

function registerComponentSchemas(
	documentCtx: DocumentContext,
	schema: oas32.OpenAPIObject,
) {
	const sorted = sortedComponentSchemas(schema);

	for (const [schemaName, schemaObject] of sorted) {
		declareValidator(documentCtx.validators, schemaName, schemaObject);
	}

	for (const [schemaName, schemaObject] of sorted) {
		registerTypesFromSchema(
			documentCtx.typesAndInterfaces,
			documentCtx.typesFile,
			schemaName,
			schemaObject,
		);

		registerValidatorFromSchema(
			documentCtx.validators,
			documentCtx.valibotFile,
			schemaName,
			schemaObject,
			documentCtx.inputOnly,
		);

		addEnumValues(documentCtx.enumsFile, schemaName, schemaObject);
	}
}

function declareCommandClass(
	commandsFile: SourceFile,
	method: string,
	operationObject: OperationWithId,
) {
	const isOperationDeprecated = operationObject.deprecated === true;
	const deprecationDocs: DeprecationDocs = isOperationDeprecated
		? [
				{
					kind: StructureKind.JSDoc,
					tags: [
						{
							tagName: "deprecated",
						},
					],
				},
			]
		: [];

	const commandName = pascalCase(
		operationObject.operationId.replace(/command$/i, ""),
		"Command",
	);

	const commandClass = chunkOf(commandsFile).addClass({
		name: commandName,
		isExported: true,
		extends: "Command",
		docs: [...deprecationDocs],
		properties: [
			{
				name: "method",
				initializer: Writers.assertion((w) => w.quote(method), "const"),
				hasOverrideKeyword: true,
				scope: Scope.Public,
			},
		],
	});

	const jsdoc = commandClass.addJsDoc({
		description: `\n${wordWrap(operationObject.description || commandName)}\n`,

		tags: operationObject.summary
			? [
					{
						tagName: "summary",
						text: wordWrap(operationObject.summary),
					},
				]
			: [],
	});

	if (isOperationDeprecated) {
		jsdoc.addTag({
			tagName: "deprecated",
		});
	}

	return { commandName, commandClass, deprecationDocs };
}

function isObjectSchema(value: unknown): value is oas30.SchemaObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// valibot coercion inspects the schema, so a $ref has to go first
function withResolvedSchema(refs: Refs, parameter: oas30.ParameterObject) {
	const resolvedSchema =
		parameter.schema && "$ref" in parameter.schema
			? (refs.get(parameter.schema.$ref) ?? undefined)
			: undefined;

	const paramWithResolvedSchema: oas30.ParameterObject = {
		...parameter,
		...(isObjectSchema(resolvedSchema) && { schema: resolvedSchema }),
	};

	return paramWithResolvedSchema;
}

function collectParameters(
	refs: Refs,
	path: string,
	pathItemObject: oas32.PathItemObject,
	operationObject: OperationWithId,
) {
	const pathParameters: oas30.ParameterObject[] = [];
	const queryParameters: oas30.ParameterObject[] = [];
	const headerParameters: oas30.ParameterObject[] = [];

	for (const parameter of [
		...(operationObject.parameters || []),
		...(pathItemObject.parameters || []),
	]) {
		const resolvedParameter: unknown =
			"$ref" in parameter ? refs.get(parameter.$ref) : parameter;

		if (!isParameterObject(resolvedParameter)) {
			throw new Error(
				`${operationObject.operationId}: ${"$ref" in parameter ? parameter.$ref : "a parameter"} does not resolve to a parameter object`,
			);
		}

		if (resolvedParameter.in === "path") {
			pathParameters.push(resolvedParameter);
		}

		if (resolvedParameter.in === "query") {
			queryParameters.push(withResolvedSchema(refs, resolvedParameter));
		}

		if (resolvedParameter.in === "header") {
			headerParameters.push(withResolvedSchema(refs, resolvedParameter));
		}

		// OpenAPI 3.2's `in: "querystring"` hands over the whole query
		// string as one content-typed value. The generator expresses a
		// query as named parameters, so generating this operation would
		// drop its query in silence
		if (isQuerystringLocation(resolvedParameter.in)) {
			throw new Error(
				`${operationObject.operationId}: parameter "${resolvedParameter.name}" uses \`in: querystring\`, which this generator does not support. Declare the members as \`in: query\` parameters instead.`,
			);
		}

		// no command or validator reads a cookie, so generating this
		// operation would drop the parameter in silence
		if (resolvedParameter.in === "cookie") {
			throw new Error(
				`${operationObject.operationId}: parameter "${resolvedParameter.name}" uses \`in: cookie\`, which this generator does not support.`,
			);
		}
	}

	// Extract path parameters from URL pattern that weren't declared this
	// is technically against the spec but we are the good guys
	for (const [, paramName] of path.matchAll(/\{(\w+)\}/g)) {
		const alreadyDeclared = pathParameters.some((p) => p.name === paramName);

		if (!alreadyDeclared && paramName) {
			pathParameters.push({
				name: paramName,
				in: "path",
				required: true,
				schema: { type: "string" },
			});
		}
	}

	const parameters: OperationParameterObjects = {
		path: pathParameters,
		query: queryParameters,
		header: headerParameters,
	};

	return parameters;
}

// rest-client exports one serializer per OAS 3.2 §4.12.6 query style
const defaultSerializer = "formExplodeSerializer";

const serializers = {
	form: "formJoinSerializer",
	spaceDelimited: "spaceDelimitedSerializer",
	pipeDelimited: "pipeDelimitedSerializer",
	deepObject: "deepObjectSerializer",
} as const satisfies Record<QueryParamSpec["style"], string>;

function pickSerializer(spec: QueryParamSpec) {
	return spec.style === "form" && spec.explode
		? defaultSerializer
		: serializers[spec.style];
}

// deepObject brackets an object and writes an array as form with explode
function serializersWriting(spec: QueryParamSpec) {
	const named = pickSerializer(spec);

	return named === defaultSerializer && spec.type === "array"
		? [defaultSerializer, serializers.deepObject]
		: [named];
}

// A command names one serializer for its whole query
function chooseQuerySerializer(
	operationId: string,
	queryParameters: oas30.ParameterObject[],
) {
	// every serializer writes a scalar alike, so arrays and objects choose
	const specs = queryParameters
		.map((parameter) => queryParameterSpec(parameter))
		.filter((spec) => spec !== undefined);

	let agreed: string[] = [defaultSerializer, ...Object.values(serializers)];

	for (const spec of specs) {
		const writing = serializersWriting(spec);

		agreed = agreed.filter((name) => writing.includes(name));
	}

	if (agreed.length === 0) {
		const written = specs
			.map((spec) => {
				const label =
					spec.style === "form" ? `form, explode: ${spec.explode}` : spec.style;

				return `"${spec.name}" (${label})`;
			})
			.join(", ");

		throw new Error(
			`${operationId}: query parameters ${written} are written by different serializers, and a command names one for its whole query. Declare one style across the operation's query parameters.`,
		);
	}

	// a command inherits form with explode, which leaves it to name nothing
	return agreed.includes(defaultSerializer) ? undefined : agreed[0];
}

function importSerializer(commandsFile: SourceFile, name: string) {
	const restClientImport = commandsFile.getImportDeclarationOrThrow(
		(declaration) =>
			declaration.getModuleSpecifier().getLiteralValue() ===
			"@block65/rest-client",
	);

	const alreadyImported = restClientImport
		.getNamedImports()
		.some((namedImport) => namedImport.getName() === name);

	if (!alreadyImported) {
		restClientImport.addNamedImport(name);
	}
}

function addQuerySerializer(
	commandsFile: SourceFile,
	commandClass: ClassDeclaration,
	operationId: string,
	queryParameters: oas30.ParameterObject[],
) {
	const serializer = chooseQuerySerializer(operationId, queryParameters);

	if (!serializer) {
		return;
	}

	importSerializer(commandsFile, serializer);

	commandClass.addProperty({
		name: "querySerializer",
		hasOverrideKeyword: true,
		scope: Scope.Public,
		initializer: serializer,
	});
}

function parameterProperty(
	typesAndInterfaces: Map<string, NamedDeclaration>,
	parameter: oas30.ParameterObject,
	name: string,
	propertyName: string,
) {
	if (!parameter.schema) {
		return {
			name: propertyName,
			hasQuestionToken: !parameter.required,
		};
	}

	const type = schemaToType(
		typesAndInterfaces,
		parameter.required
			? {
					required: [name],
				}
			: {},
		name,
		parameter.schema,
		{
			// query parameters can't be strictly "boolean"
			booleanAsStringish: true,
			integerAsStringish: true,
		},
	);

	const resolvedType = type.type;

	return {
		...type,
		name: propertyName,
		hasQuestionToken: !parameter.required,
		...(resolvedType !== undefined && {
			type: resolvedType,
		}),
	};
}

function addQueryType(
	documentCtx: DocumentContext,
	{
		commandClass,
		deprecationDocs,
	}: OperationContext | ReturnType<typeof declareCommandClass>,
	queryParameters: oas30.ParameterObject[],
) {
	const queryType =
		queryParameters.length > 0
			? chunkOf(documentCtx.typesFile).addTypeAlias({
					name: pascalCase(commandClass.getName() || "INVALID", "Query"),
					docs: deprecationDocs,
					isExported: true,
					type: Writers.objectType({
						properties: queryParameters.map((qp) => {
							const name = castToValidJsIdentifier(qp.name);

							return parameterProperty(
								documentCtx.typesAndInterfaces,
								qp,
								name,
								name,
							);
						}),
					}),
				})
			: undefined;

	ensureTypeImport(documentCtx.typesImportDecl, queryType);

	return queryType;
}

function addHeaderType(
	documentCtx: DocumentContext,
	{ commandClass, deprecationDocs }: ReturnType<typeof declareCommandClass>,
	headerParameters: oas30.ParameterObject[],
) {
	const headerType =
		headerParameters.length > 0
			? chunkOf(documentCtx.typesFile).addTypeAlias({
					name: pascalCase(commandClass.getName() || "INVALID", "Header"),
					docs: deprecationDocs,
					isExported: true,
					type: Writers.objectType({
						properties: headerParameters.map((hp) => {
							const name = hp.name.toLowerCase();

							return parameterProperty(
								documentCtx.typesAndInterfaces,
								hp,
								name,
								JSON.stringify(name),
							);
						}),
					}),
				})
			: undefined;

	ensureTypeImport(documentCtx.typesImportDecl, headerType);

	return headerType;
}

function jsonBodyTypeOf(
	documentCtx: DocumentContext,
	deprecationDocs: DeprecationDocs,
	operationId: string,
	jsonRequestBodyObject: oas32.MediaTypeObject | undefined,
) {
	const schema = jsonRequestBodyObject?.schema;

	if (schema === undefined) {
		return;
	}

	if (isReferenceObject(schema)) {
		return documentCtx.typesAndInterfaces.get(schema.$ref);
	}

	if (
		isSchemaObject(schema) &&
		schema.type === "array" &&
		isReferenceObject(schema.items)
	) {
		return documentCtx.typesAndInterfaces.get(schema.items.$ref);
	}

	// Named for the media type because only an application/json
	// request body is generated
	const name = castToValidJsIdentifier(pascalCase(operationId, "JsonBody"));

	const type = schemaToType(
		documentCtx.typesAndInterfaces,
		isSchemaObject(schema) && schema.required
			? {
					required: [name],
				}
			: {},
		name,
		schema,
	);

	return chunkOf(documentCtx.typesFile).addTypeAlias({
		name,
		docs: deprecationDocs,
		type: typeof type.type === "function" ? type.type : String(type.type),
	});
}

function resolveBodyTypes(
	documentCtx: DocumentContext,
	{ commandClass, deprecationDocs }: ReturnType<typeof declareCommandClass>,
	operationObject: OperationWithId,
) {
	const requestBodyObject =
		operationObject.requestBody && !("$ref" in operationObject.requestBody)
			? operationObject.requestBody
			: undefined;

	const content = resolveContent(documentCtx.refs, requestBodyObject?.content);
	const jsonRequestBodyObject = content["application/json"];

	const jsonBodyType = jsonBodyTypeOf(
		documentCtx,
		deprecationDocs,
		operationObject.operationId,
		jsonRequestBodyObject,
	);

	const nonJsonBodyEntries = Object.entries(content).filter(
		([, o]) => o !== jsonRequestBodyObject,
	);

	if (jsonBodyType && nonJsonBodyEntries.length > 0) {
		console.warn(
			commandClass.getName(),
			"Non-json and json body types are not supported together yet",
		);
	}

	const hasNonJsonBody = !jsonBodyType && nonJsonBodyEntries.length > 0;

	// declared before the alias that unions them, as chunkOf requires
	const nonJsonBodyNames = hasNonJsonBody
		? nonJsonBodyEntries.map(([contentType]) =>
				chunkOf(documentCtx.typesFile)
					.addTypeAlias({
						name: pascalCase(
							`${commandClass.getName() || "INVALID"} Body ${contentType}`,
						),
						type: "NonNullable<RequestInit['body']>",
					})
					.getName(),
			)
		: [];

	const nonJsonBodyType = hasNonJsonBody
		? chunkOf(documentCtx.typesFile).addTypeAlias({
				docs: deprecationDocs,
				name: pascalCase(`${commandClass.getName() || "INVALID"} Body NonJson`),
				isExported: true,
				type: Writers.objectType({
					properties: [
						{
							name: nonJsonBodyPropName,
							type: createUnion(...nonJsonBodyNames),
						},
					],
				}),
			})
		: undefined;

	return { jsonRequestBodyObject, jsonBodyType, nonJsonBodyType };
}

function addParamsType(
	documentCtx: DocumentContext,
	{ commandClass, deprecationDocs }: ReturnType<typeof declareCommandClass>,
	pathParameters: oas30.ParameterObject[],
) {
	return pathParameters.length > 0
		? chunkOf(documentCtx.typesFile).addTypeAlias({
				name: pascalCase(`${commandClass.getName() || "INVALID"}Params`),
				docs: deprecationDocs,
				type: Writers.objectType({
					properties: pathParameters.map((p) => {
						const name = castToValidJsIdentifier(p.name);

						const type = schemaToType(
							documentCtx.typesAndInterfaces,
							p.required
								? {
										required: [name],
									}
								: {},
							name,
							p.schema || {
								type: "string",
								description:
									"// TODO: check this? no path param schema was found",
							},
							{
								// parameters can't be strictly "boolean"
								booleanAsStringish: true,
								integerAsStringish: true,
							},
						);

						return {
							...type,
							name,
							type: type.type || unspecifiedKeyword,
						};
					}),
				}),
				isExported: true,
			})
		: undefined;
}

function addInputType(
	documentCtx: DocumentContext,
	{ commandClass }: ReturnType<typeof declareCommandClass>,
	{
		jsonRequestBodyObject,
		jsonBodyType,
		nonJsonBodyType,
	}: ReturnType<typeof resolveBodyTypes>,
	paramsType: TypeAliasDeclaration | undefined,
	queryType: TypeAliasDeclaration | undefined,
) {
	const bodyType =
		(jsonBodyType &&
			chunkOf(documentCtx.typesFile).addTypeAlias({
				name: pascalCase(commandClass.getName() || "", "Body"),
				type: jsonBodyType.getName(),
				isExported: true,
			})) ||
		nonJsonBodyType;

	if (bodyType) {
		ensureTypeImport(documentCtx.typesImportDecl, bodyType);
	}

	// An array body intersected with the parameters reads as the array
	// alone, and the parameters vanish. It goes under `body`, the same
	// way a non-JSON body already does
	const jsonBodySchema = jsonRequestBodyObject?.schema;
	const jsonBodyIsArray =
		jsonBodySchema !== undefined &&
		isSchemaObject(jsonBodySchema) &&
		jsonBodySchema.type === "array";
	const wrapJsonBody = jsonBodyIsArray && (!!paramsType || !!queryType);

	const wrappedJsonBodyType =
		wrapJsonBody && jsonBodyType
			? chunkOf(documentCtx.typesFile).addTypeAlias({
					name: pascalCase(commandClass.getName() || "", "BodyWrapper"),
					type: Writers.objectType({
						properties: [{ name: inputBodyName, type: jsonBodyType.getName() }],
					}),
				})
			: undefined;

	const inputTypeNode = createIntersection(
		wrappedJsonBodyType?.getName() ||
			jsonBodyType?.getName() ||
			nonJsonBodyType?.getName(),
		paramsType?.getName(),
		queryType?.getName(),
	);

	const inputType = chunkOf(documentCtx.typesFile).addTypeAlias({
		name: pascalCase(commandClass.getName() || "", "Input"),
		type: inputTypeNode,
		isExported: true,
	});
	ensureTypeImport(documentCtx.typesImportDecl, inputType);

	return { inputType, inputTypeNode, wrapJsonBody };
}

// the first 2xx response with content, which settles the command's output
function firstSuccessResponse(operationObject: OperationWithId) {
	const firstSuccess = Object.entries(operationObject.responses ?? {}).find(
		([s]) => s.startsWith("2"),
	);

	if (!firstSuccess) {
		return;
	}

	const [statusCode, response] = firstSuccess;

	if (statusCode === "204" || "$ref" in response) {
		return;
	}

	return response;
}

function firstJsonResponseSchema(refs: Refs, operationObject: OperationWithId) {
	// Resolve the first 2xx JSON response schema (inline or $ref) so the
	// validator pipeline treats responses the same as request bodies
	return resolveContent(refs, firstSuccessResponse(operationObject)?.content)[
		"application/json"
	]?.schema;
}

// Generate the valibot validator for the operation input
function registerOperationValidators(
	documentCtx: DocumentContext,
	{
		commandName,
		queryParameters,
		headerParameters,
		pathParameters,
		jsonRequestBodyObject,
	}: OperationContext,
	operationObject: OperationWithId,
	sequential: SequentialContent | undefined,
) {
	const responseSchema = firstJsonResponseSchema(
		documentCtx.refs,
		operationObject,
	);

	const operationSchemas = createValidatorForOperationInput(
		documentCtx.validators,
		documentCtx.valibotFile,
		commandName,
		{
			...(jsonRequestBodyObject?.schema !== undefined && {
				body: jsonRequestBodyObject.schema,
			}),
			...(responseSchema !== undefined && {
				response: responseSchema,
			}),
			...(sequential && {
				data: sequential.schema,
			}),
			params: pathParameters,
			query: queryParameters,
			header: headerParameters,
		},
		documentCtx.inputOnly,
	);

	// Track operation for middleware generation (use coerced schemas)
	const middlewareExportName = castToValidJsIdentifier(
		operationObject.operationId.replace(/Command$/i, ""),
	);
	checkQueryParameters(operationObject.operationId, queryParameters);

	// Consumers read one variant, so --input-only substitutes it here
	const wireSchemas = documentCtx.inputOnly
		? operationSchemas.input
		: operationSchemas.wire;

	documentCtx.allOperations.push({
		exportName: middlewareExportName,
		schemas: wireSchemas,
		queryParams: queryParameters
			.map((parameter) => queryParameterSpec(parameter))
			.filter((spec) => spec !== undefined),
	});

	return wireSchemas;
}

// the parts of a non-JSON body command's input that the widening applies to
function widenedInputParts({
	nonJsonBodyType,
	pathType,
	queryType,
}: Pick<OperationContext, "nonJsonBodyType" | "pathType" | "queryType">) {
	return nonJsonBodyType
		? [pathType, queryType].filter((part) => part !== undefined)
		: [];
}

function widenedInputType({
	inputType,
	nonJsonBodyType,
	pathType,
	queryType,
}: Pick<
	OperationContext,
	"inputType" | "nonJsonBodyType" | "pathType" | "queryType"
>) {
	// Widen optional fields with `| undefined` at the serialization
	// boundary. Outbound payloads are JSON.stringified, which drops
	// `undefined`, so callers can pass `{ field: undefined }` even
	// under exactOptionalPropertyTypes. A non-JSON `body` field holds
	// a BodyInit class instance, which UndefinedOnPartialDeep would
	// mangle, so only the parameters beside it are widened
	if (!nonJsonBodyType) {
		return `UndefinedOnPartialDeep<${inputType.getName()}>`;
	}

	const parts = widenedInputParts({ nonJsonBodyType, pathType, queryType });

	return parts.length > 0
		? `${nonJsonBodyType.getName()} & UndefinedOnPartialDeep<${parts.map((part) => part.getName()).join(" & ")}>`
		: inputType.getName();
}

function addInputTypeArgument(
	documentCtx: DocumentContext,
	operationCtx: OperationContext,
) {
	const { commandClass, inputType, inputTypeNode, nonJsonBodyType } =
		operationCtx;
	const inputTypeArg = widenedInputType(operationCtx);
	const parts = widenedInputParts(operationCtx);

	for (const part of parts) {
		ensureTypeImport(documentCtx.typesImportDecl, part);
	}

	// `A | never` is `A`, so the member is left out
	if (inputTypeNode !== neverKeyword) {
		documentCtx.inputTypeArgs.add(inputTypeArg);

		for (const name of parts.length > 0 && nonJsonBodyType
			? [nonJsonBodyType, ...parts].map((part) => part.getName())
			: [inputType.getName()]) {
			documentCtx.inputTypeNames.add(name);
		}
	}

	commandClass.getExtends()?.addTypeArgument(inputTypeArg);
}

function addReferencedOutput(
	documentCtx: DocumentContext,
	{ commandClass }: OperationContext,
	outputRef: string,
	isArray: boolean,
) {
	const outputType = documentCtx.typesAndInterfaces.get(outputRef);

	if (outputType) {
		documentCtx.outputTypes.add(outputType);
		ensureTypeImport(documentCtx.typesImportDecl, outputType);
	}

	const outputTypeName = `${outputType?.getName()}${isArray ? "[]" : ""}`;

	if (isArray) {
		documentCtx.outputTypes.add(outputTypeName);
	}

	commandClass.getExtends()?.addTypeArgument(outputTypeName);

	// Handler-return alias for `c.json(...)` on the server side.
	// The value is JSON.stringified, which drops `undefined`, so
	// optional fields may hold `undefined`. Mirrors the `input*`
	// prefix used for the lax variant in the valibot module
	chunkOf(documentCtx.typesFile).addTypeAlias({
		name: pascalCase("Input", commandClass.getName() || "INVALID", "Response"),
		type: `UndefinedOnPartialDeep<${outputTypeName}>`,
		isExported: true,
	});
}

function addInlineOutput(
	documentCtx: DocumentContext,
	{ commandClass }: OperationContext,
	schema: SchemaNode,
) {
	const outputType = schemaToType(
		documentCtx.typesAndInterfaces,
		{},
		"",
		schema,
	);

	const responseTypeAlias = chunkOf(documentCtx.typesFile).addTypeAlias({
		name: pascalCase(commandClass.getName() || "INVALID", "Output"),
		type:
			typeof outputType.type === "function"
				? outputType.type
				: Writers.unionType(`${outputType.type}`, "undefined"),
		isExported: true,
	});

	ensureTypeImport(documentCtx.typesImportDecl, responseTypeAlias);

	commandClass.getExtends()?.addTypeArgument(responseTypeAlias.getName());
	documentCtx.outputTypes.add(responseTypeAlias);

	chunkOf(documentCtx.typesFile).addTypeAlias({
		name: pascalCase("Input", commandClass.getName() || "INVALID", "Response"),
		type: `UndefinedOnPartialDeep<${responseTypeAlias.getName()}>`,
		isExported: true,
	});
}

function resolveSchema(refs: Refs, operationId: string, schema: SchemaNode) {
	if (typeof schema === "boolean") {
		throw new TypeError(
			`${operationId}: a boolean item schema has no content to decode`,
		);
	}

	return resolveObject(refs, schema);
}

// itemSchema arrived in OAS 3.2
function canStateItemSchema(openapiVersion: string) {
	const [major = 0, minor = 0] = openapiVersion.split(".").map(Number);

	return major > 3 || (major === 3 && minor >= 2);
}

function sequentialContent(
	refs: Refs,
	openapiVersion: string,
	operationObject: OperationWithId,
) {
	const { operationId } = operationObject;
	const responseContent = resolveContent(
		refs,
		firstSuccessResponse(operationObject)?.content,
	);

	if (responseContent["application/json"]) {
		return;
	}

	const found = Object.entries(responseContent).find(
		([mediaType, media]) =>
			media.itemSchema && mediaType in sequentialMediaTypes,
	);

	const media = found && sequentialMediaTypes[found[0]];

	if (!found?.[1].itemSchema || !media) {
		return;
	}

	if (!canStateItemSchema(openapiVersion)) {
		throw new Error(
			`${operationId}: itemSchema is OAS 3.2, and the document declares openapi ${openapiVersion}`,
		);
	}

	const { contentProperty } = media;
	const itemSchema = resolveSchema(refs, operationId, found[1].itemSchema);
	const variants = (itemSchema.oneOf ?? itemSchema.anyOf ?? [itemSchema]).map(
		(variant) => resolveSchema(refs, operationId, variant),
	);

	const contents = variants.map((variant) => {
		const content = contentProperty
			? variant.properties?.[contentProperty]
			: variant;

		// a variant composed further, or content declared outside the variant,
		// would otherwise pass as plain text
		if (
			!content ||
			variant.allOf ||
			(variant !== itemSchema && (variant.oneOf || variant.anyOf))
		) {
			throw new Error(
				`${operationId}: each itemSchema variant needs its own ${contentProperty ?? "content"} schema`,
			);
		}

		return resolveSchema(refs, operationId, content);
	});

	// an item content with no contentMediaType is a string, as SSE data is
	const mediaTypes = new Set(
		contents.map((content) =>
			"contentMediaType" in content && content.contentMediaType
				? content.contentMediaType
				: "text/plain",
		),
	);

	// dataTransformer is per command, so every variant shares one decoding
	const [contentMediaType] = mediaTypes;
	const decoding = contentMediaType && dataDecodings[contentMediaType];

	if (mediaTypes.size !== 1 || !decoding) {
		throw new Error(
			`${operationId}: item content media types ${[...mediaTypes].join(", ")} need one decoding, from ${Object.keys(dataDecodings).join(", ")}`,
		);
	}

	const decodedSchemas = contents.map((content) => {
		const decoded = decoding.decodedSchema(content);

		if (!decoded) {
			throw new Error(
				`${operationId}: item content of ${contentMediaType} needs a contentSchema`,
			);
		}

		return decoded;
	});

	const schemas = [
		...new Map(
			decodedSchemas.map((schema) => [JSON.stringify(schema), schema]),
		).values(),
	];

	return {
		media,
		decoding,
		schema:
			schemas.length === 1 && schemas[0] ? schemas[0] : { anyOf: schemas },
	};
}

type SequentialContent = NonNullable<ReturnType<typeof sequentialContent>>;

function addSequentialOutput(
	documentCtx: DocumentContext,
	{ commandClass }: OperationContext,
	{ media, decoding, schema }: SequentialContent,
) {
	const outputType = schemaToType(
		documentCtx.typesAndInterfaces,
		{},
		"",
		schema,
	);

	const outputTypeAlias = chunkOf(documentCtx.typesFile).addTypeAlias({
		name: pascalCase(commandClass.getName() || "INVALID", "Output"),
		type: outputType.type ?? unspecifiedKeyword,
		isExported: true,
	});

	ensureTypeImport(documentCtx.typesImportDecl, outputTypeAlias);

	commandClass.getExtends()?.getExpression().replaceWithText(media.baseClass);
	commandClass.getExtends()?.addTypeArgument(outputTypeAlias.getName());

	documentCtx.sequentialOutputs.push({
		output: outputTypeAlias.getName(),
		item: media.itemType(outputTypeAlias.getName()),
	});

	if (decoding.transformer) {
		commandClass.addProperty({
			name: "dataTransformer",
			scope: Scope.Public,
			hasOverrideKeyword: true,
			isReadonly: true,
			initializer: decoding.transformer,
		});
	}
}

function jsonOutputRef({ schema }: oas32.MediaTypeObject) {
	const arrayRef =
		schema !== undefined &&
		isSchemaObject(schema) &&
		isReferenceObject(schema.items) &&
		schema.items.$ref;

	const regularRef = isReferenceObject(schema) && schema.$ref;

	const outputRef = arrayRef || regularRef;

	return outputRef ? { ref: outputRef, isArray: !!arrayRef } : undefined;
}

// rest-client resolves a bodiless success, a 204 included, with undefined
function isBodiless(
	statusCode: string,
	res: oas32.ResponseObject | oas32.ReferenceObject,
) {
	return (
		statusCode === "204" ||
		(!("$ref" in res) && Object.keys(res.content ?? {}).length === 0)
	);
}

function addOutputTypeArgument(
	documentCtx: DocumentContext,
	operationCtx: OperationContext,
	operationObject: OperationWithId,
	sequential: SequentialContent | undefined,
) {
	const { commandClass } = operationCtx;

	let hasOutputType = false;

	const successResponses = Object.entries({
		...operationObject.responses,
	}).filter(([s]) => s.startsWith("2"));

	// with only failures documented, json() and send() only ever reject
	if (successResponses.length === 0) {
		commandClass.getExtends()?.addTypeArgument(neverKeyword);
		hasOutputType = true;
	}

	for (const [statusCode, response] of successResponses) {
		// Output is one type argument, so the first usable 2xx response
		// settles it. An operation documenting both a 200 and a 204 would
		// otherwise add a second argument, which lands in the query slot
		// and is not a query type
		if (hasOutputType) {
			break;
		}

		if (isBodiless(statusCode, response)) {
			commandClass.getExtends()?.addTypeArgument(emptyKeyword);

			documentCtx.outputTypes.add(emptyKeyword);
			hasOutputType = true;
			break;
		}

		// we dont support refs as response objects
		if ("$ref" in response) {
			break;
		}

		const jsonResponse = resolveContent(documentCtx.refs, response.content)[
			"application/json"
		];

		if (!jsonResponse) {
			if (sequential) {
				addSequentialOutput(documentCtx, operationCtx, sequential);
				hasOutputType = true;
			}

			break;
		}

		const outputRef = jsonOutputRef(jsonResponse);

		if (outputRef) {
			addReferencedOutput(
				documentCtx,
				operationCtx,
				outputRef.ref,
				outputRef.isArray,
			);
			hasOutputType = true;
		} else if (jsonResponse.schema) {
			addInlineOutput(documentCtx, operationCtx, jsonResponse.schema);
			hasOutputType = true;
		}
	}

	if (!hasOutputType) {
		commandClass.getExtends()?.addTypeArgument(unspecifiedKeyword);
	}
}

function registerValidatedCommand(
	documentCtx: DocumentContext,
	commandName: string,
	wireSchemas: { response?: string; data?: string },
) {
	// Lean commands import zero schemas. A validated subclass sets
	// the field that rest-client's parse hooks read. The server middleware
	// imports body, param and query schemas directly.
	//
	// sequentialContent skips a JSON response, so one of these is set at most
	const [field, schema] = wireSchemas.data
		? (["dataSchema", wireSchemas.data] as const)
		: (["responseSchema", wireSchemas.response] as const);

	if (schema) {
		documentCtx.validatedSubclasses.push({ commandName, field, schema });
	} else {
		documentCtx.validatedReExports.push(commandName);
	}
}

function addQueryAndHeaderTypeArguments({
	commandClass,
	queryType,
	headerType,
}: OperationContext) {
	// query
	if (queryType) {
		commandClass.getExtends()?.addTypeArgument(queryType.getName());
	}

	// headers type argument (4th generic on Command)
	if (headerType) {
		// fill in query slot if missing
		if (!queryType) {
			commandClass.getExtends()?.addTypeArgument(neverKeyword);
		}

		commandClass.getExtends()?.addTypeArgument(headerType.getName());
	}
}

function constructorInputs(
	{
		queryParameters,
		queryType,
		headerParameters,
		headerType,
		pathParameters,
		pathType,
		jsonBodyType,
		nonJsonBodyType,
	}: OperationContext,
	path: string,
) {
	const hasPathParams = path.includes("{");
	const pathname = hasPathParams
		? `encodePath\`${path.replaceAll("{", "${")}\``
		: `"${path}"`;

	const hasJsonBody = !!jsonBodyType;

	const hasNonJsonBody = !!nonJsonBodyType;

	const hasQuery =
		!!queryType &&
		!isUnspecifiedKeyword(queryType) &&
		queryParameters.length > 0;

	const hasParams =
		!!pathType && !isUnspecifiedKeyword(pathType) && pathParameters.length > 0;

	const hasHeaders = !!headerType && headerParameters.length > 0;

	const allInputOptional =
		!hasParams &&
		!hasJsonBody &&
		!hasNonJsonBody &&
		queryParameters.every((qp) => !qp.required);

	const allHeadersOptional = headerParameters.every((hp) => !hp.required);

	const queryParameterNames = queryParameters
		.map((q) => q.name)
		.map((name) => castToValidJsIdentifier(name));

	const pathParameterNames = pathParameters
		.map((q) => q.name)
		.map((name) => castToValidJsIdentifier(name));

	return {
		pathname,
		hasJsonBody,
		hasNonJsonBody,
		hasQuery,
		hasParams,
		hasHeaders,
		allInputOptional,
		allHeadersOptional,
		queryParameterNames,
		pathParameterNames,
	};
}

type ConstructorInputs = ReturnType<typeof constructorInputs>;

function inputDestructuring(
	{
		hasJsonBody,
		hasNonJsonBody,
		queryParameterNames,
		pathParameterNames,
	}: ConstructorInputs,
	wrapJsonBody: boolean,
) {
	const paramsToDestructure = [...pathParameterNames, ...queryParameterNames];

	switch (true) {
		case paramsToDestructure.length > 0 && hasNonJsonBody:
			return `{${[...paramsToDestructure, nonJsonBodyPropName].join(", ")} }`;
		case paramsToDestructure.length > 0 && hasJsonBody:
			return `{${[
				...paramsToDestructure,
				wrapJsonBody ? inputBodyName : `...${inputBodyName}`,
			].join(", ")} }`;
		case paramsToDestructure.length > 0 && !hasJsonBody:
			return `{${paramsToDestructure.join(", ")} }`;
		case hasNonJsonBody:
			return `{${nonJsonBodyPropName}}`;
		case hasJsonBody:
			return inputBodyName;
		default:
			return "_";
	}
}

function superArguments({
	pathname,
	hasJsonBody,
	hasNonJsonBody,
	hasQuery,
	hasHeaders,
	queryParameterNames,
}: ConstructorInputs) {
	const headersArg = hasHeaders ? "headers" : undefined;

	const queryOrHeaderArgs = iife(() => {
		if (hasQuery) {
			return [`stripUndefined({${queryParameterNames.join(", ")}})`];
		}
		if (hasHeaders) {
			return [emptyKeyword];
		}
		return [];
	});

	if (hasJsonBody) {
		return [
			pathname,
			`jsonStringify(${inputBodyName})`,
			...queryOrHeaderArgs,
			...(headersArg ? [headersArg] : []),
		];
	}

	if (hasNonJsonBody) {
		return [
			pathname,
			nonJsonBodyPropName,
			...queryOrHeaderArgs,
			...(headersArg ? [headersArg] : []),
		];
	}

	if (hasQuery) {
		return [
			pathname,
			emptyKeyword,
			`stripUndefined({${queryParameterNames.join(", ")}})`,
			...(headersArg ? [headersArg] : []),
		];
	}

	if (hasHeaders && headersArg) {
		return [pathname, emptyKeyword, emptyKeyword, headersArg];
	}

	return [pathname];
}

function addInputConstructor(
	operationCtx: OperationContext,
	inputs: ConstructorInputs,
) {
	const { commandClass, inputType, headerType, wrapJsonBody } = operationCtx;
	const { hasHeaders, allInputOptional, allHeadersOptional } = inputs;

	const ctor = commandClass.addConstructor();

	if (!isUnspecifiedKeyword(inputType)) {
		const cctorParam = ctor.addParameter({
			name: "input",
			type: widenedInputType(operationCtx),
			...(allInputOptional && { hasQuestionToken: true }),
		});

		if (hasHeaders && headerType) {
			ctor.addParameter({
				name: "headers",
				type: headerType.getName(),
				...(allHeadersOptional && { hasQuestionToken: true }),
			});
		}

		ctor.addStatements([
			{
				kind: StructureKind.VariableStatement,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						kind: StructureKind.VariableDeclaration,
						initializer: allInputOptional
							? `${cctorParam.getName()} ?? {}`
							: cctorParam.getName(),
						name: inputDestructuring(inputs, wrapJsonBody),
					},
				],
			},
			"super();",
		]);
	}

	const superKeyword = ctor.getFirstDescendantByKind(SyntaxKind.SuperKeyword);

	const callExpr = superKeyword?.getParentIfKindOrThrow(
		SyntaxKind.CallExpression,
	);

	// type narrowing
	if (Node.isCallExpression(callExpr)) {
		callExpr.addArguments(superArguments(inputs));
	}
}

function addCommandConstructor(operationCtx: OperationContext, path: string) {
	const inputs = constructorInputs(operationCtx, path);
	const { hasNonJsonBody, hasJsonBody, hasQuery, hasParams, hasHeaders } =
		inputs;

	if (hasNonJsonBody || hasJsonBody || hasQuery || hasParams || hasHeaders) {
		addInputConstructor(operationCtx, inputs);
	} else {
		const ctor = operationCtx.commandClass.addConstructor();
		ctor.addStatements([`super(${inputs.pathname});`]);
	}
}

function processOperation(
	documentCtx: DocumentContext,
	path: string,
	pathItemObject: oas32.PathItemObject,
	method: string,
	operationObject: OperationWithId,
) {
	const command = declareCommandClass(
		documentCtx.commandsFile,
		method,
		operationObject,
	);
	const {
		path: pathParameters,
		query: queryParameters,
		header: headerParameters,
	} = collectParameters(
		documentCtx.refs,
		path,
		pathItemObject,
		operationObject,
	);

	addQuerySerializer(
		documentCtx.commandsFile,
		command.commandClass,
		operationObject.operationId,
		queryParameters,
	);

	const queryType = addQueryType(documentCtx, command, queryParameters);
	const headerType = addHeaderType(documentCtx, command, headerParameters);
	const body = resolveBodyTypes(documentCtx, command, operationObject);
	const pathType = addParamsType(documentCtx, command, pathParameters);
	const input = addInputType(documentCtx, command, body, pathType, queryType);

	const operationCtx: OperationContext = {
		...command,
		queryParameters,
		queryType,
		headerParameters,
		headerType,
		pathParameters,
		pathType,
		...body,
		...input,
	};

	const sequential = sequentialContent(
		documentCtx.refs,
		documentCtx.openapiVersion,
		operationObject,
	);

	const wireSchemas = registerOperationValidators(
		documentCtx,
		operationCtx,
		operationObject,
		sequential,
	);

	addInputTypeArgument(documentCtx, operationCtx);
	addOutputTypeArgument(documentCtx, operationCtx, operationObject, sequential);
	registerValidatedCommand(documentCtx, operationCtx.commandName, wireSchemas);
	addQueryAndHeaderTypeArguments(operationCtx);
	addCommandConstructor(operationCtx, path);
	trimDefaultOutputArgument(command.commandClass);
}

function emitOperations(
	documentCtx: DocumentContext,
	schema: oas32.OpenAPIObject,
	tags: string[] | undefined,
) {
	for (const [path, pathItemObject] of Object.entries<oas32.PathItemObject>(
		schema.paths || {},
	)) {
		if (pathItemObject) {
			for (const [method, operationObject] of Object.entries(pathItemObject)
				// ensure op is an object
				.filter(
					(e): e is [string, oas32.OperationObject] => typeof e[1] === "object",
				)
				// tags
				.filter(([, o]) => !tags || o.tags?.some((t) => tags?.includes(t)))) {
				if (
					typeof operationObject === "object" &&
					hasOperationId(operationObject)
				) {
					processOperation(
						documentCtx,
						path,
						pathItemObject,
						method,
						operationObject,
					);
				}
			}
		}
	}
}

function addClientConstructor(
	clientClassDeclaration: ClassDeclaration,
	schema: oas32.OpenAPIObject,
	configType: string,
) {
	const ctor = clientClassDeclaration.addConstructor();

	const baseUrl = ctor.addParameter({
		name: "baseUrl",
		type: Writers.unionType("string", "URL"),
		initializer: `new URL('${
			new URL(`${schema.servers?.[0]?.url || "https://api.example.com"}/`).href
		}')`,
	});

	const configParam = ctor.addParameter({
		name: "config",
		type: configType,
		hasQuestionToken: true,
	});

	ctor.addStatements(["super();"]);

	const superKeyword = ctor.getFirstDescendantByKind(SyntaxKind.SuperKeyword);
	const callExpr = superKeyword?.getParentIfKindOrThrow(
		SyntaxKind.CallExpression,
	);

	// type narrowing
	if (Node.isCallExpression(callExpr)) {
		callExpr?.addArguments([baseUrl.getName(), configParam.getName()]);
	}
}

function emitClientModule(
	documentCtx: DocumentContext,
	schema: oas32.OpenAPIObject,
) {
	const {
		mainFile,
		typesFile,
		outputTypes,
		sequentialOutputs,
		inputTypeArgs,
		inputTypeNames,
	} = documentCtx;

	const serviceClientClassName = "RestServiceClient";
	const fetcherName = "createIsomorphicNativeFetcher";
	const configType = "RestServiceClientConfig";

	mainFile.addImportDeclaration({
		moduleSpecifier: "@block65/rest-client",
		namedImports: [
			serviceClientClassName,
			fetcherName,
			{
				name: configType,
				isTypeOnly: true,
			},
			...(sequentialOutputs.length > 0
				? [{ name: "ParsedStreamEvent", isTypeOnly: true }]
				: []),
		],
	});

	// Re-export the runtime error consumers need for `instanceof` narrowing,
	// sparing them a direct @block65/rest-client dependency for it alone
	mainFile.addExportDeclaration({
		moduleSpecifier: "@block65/rest-client",
		namedExports: ["ResponseValidationError"],
	});

	// Commands from another generated client fail the `<AllInputs, AllOutputs>`
	// constraint on `.json()` and `.stream()`, which guards against mixing
	// clients. stream() checks a sequential command's item type
	const outputUnionMembers = [
		...[...outputTypes]
			.map((t) => (typeof t === "string" ? t : t.getName()))
			.filter((name): name is string => !!name && name !== unspecifiedKeyword),
		...sequentialOutputs.map(({ item }) => item),
	];

	const allInputs =
		inputTypeArgs.size > 0
			? mainFile.addTypeAlias({
					name: "AllInputs",
					type: createUnion(...inputTypeArgs),
				})
			: undefined;

	const allOutputs =
		outputUnionMembers.length > 0
			? mainFile.addTypeAlias({
					name: "AllOutputs",
					type: createUnion(...outputUnionMembers),
				})
			: undefined;

	const outputTypeNames = new Set<string>(
		[...outputTypes]
			.map((t) => (typeof t === "string" ? t : t.getName()))
			.filter((n): n is string => !!n && n !== emptyKeyword)
			.map((n) => n.replace(/\[\]$/, "")),
	);

	const importNames = new Set([
		...inputTypeNames,
		...outputTypeNames,
		...sequentialOutputs.map(({ output }) => output),
	]);

	if (importNames.size > 0) {
		mainFile.addImportDeclaration({
			moduleSpecifier: typesModuleSpecifierOf(typesFile),
			namedImports: [...importNames].toSorted(),
			isTypeOnly: true,
		});
	}

	if (inputTypeArgs.size > 0) {
		mainFile.addImportDeclaration({
			moduleSpecifier: "type-fest",
			namedImports: ["Except", "UndefinedOnPartialDeep"],
			isTypeOnly: true,
		});
	}

	const clientClassDeclaration = mainFile.addClass({
		name: pascalCase(schema.info.title, "RestClient"),
		isExported: true,
		extends: `${serviceClientClassName}<${allInputs?.getName() || unspecifiedKeyword}, ${allOutputs?.getName() || unspecifiedKeyword}>`,
	});

	addClientConstructor(clientClassDeclaration, schema, configType);
}

function emitValidatedModule({
	commandsFile,
	commandsValidatedFile,
	valibotFile,
	validatedSubclasses,
	validatedReExports,
}: DocumentContext) {
	// Build the validated module. Subclasses set a schema field, and commands
	// lacking a schema are re-exported unchanged so the module keeps export
	// parity with the base and stays alias-safe
	const commandsModuleSpecifier = `./${commandsFile.getBaseNameWithoutExtension()}.js`;

	if (validatedSubclasses.length > 0) {
		// Namespace imports keep the generated file compact and stable across
		// regenerations. Adding or removing a single command leaves the import
		// list alone. Modern bundlers tree-shake namespace imports correctly
		// when the source modules are pure, which holds for both
		const commandsNs = "commands";
		const schemasNs = "schemas";

		commandsValidatedFile.addImportDeclaration({
			moduleSpecifier: commandsModuleSpecifier,
			namespaceImport: commandsNs,
		});

		commandsValidatedFile.addImportDeclaration({
			moduleSpecifier: `./${valibotFile.getBaseNameWithoutExtension()}.js`,
			namespaceImport: schemasNs,
		});

		for (const { commandName, field, schema } of validatedSubclasses) {
			commandsValidatedFile.addClass({
				name: commandName,
				isExported: true,
				extends: `${commandsNs}.${commandName}`,
				properties: [
					{
						name: field,
						scope: Scope.Public,
						hasOverrideKeyword: true,
						isReadonly: true,
						initializer: `${schemasNs}.${schema}`,
					},
				],
			});
		}
	}

	if (validatedReExports.length > 0) {
		commandsValidatedFile.addExportDeclaration({
			moduleSpecifier: commandsModuleSpecifier,
			namedExports: validatedReExports.toSorted().map((name) => ({ name })),
		});
	}
}

// Generate hono file
function emitHonoModule(
	project: Project,
	outputDir: string,
	allOperations: OperationMiddlewareInfo[],
) {
	const honoFile = createHonoFile(project, outputDir);

	// Collect all schema names needed
	const schemaImports = new Set<string>();

	for (const op of allOperations) {
		for (const schemaName of Object.values(op.schemas)) {
			if (schemaName) {
				schemaImports.add(schemaName);
			}
		}
	}

	// Add the schema imports
	addSchemaImportsToHonoFile(honoFile, [...schemaImports]);

	// Generate middleware exports for each operation
	for (const op of allOperations) {
		createHonoMiddleware(honoFile, op.exportName, op.schemas, op.queryParams);
	}

	honoFile.fixUnusedIdentifiers();

	return honoFile;
}

function trimDefaultOutputArgument(commandClass: ClassDeclaration) {
	// `Command` defaults its output to `unknown`, so an explicit `unknown`
	// repeats the default. A trailing argument can go, while an earlier one
	// holds the position of the arguments after it
	const base = commandClass.getExtends();
	const typeArguments = base?.getTypeArguments() ?? [];
	const last = typeArguments.at(-1);

	if (base && typeArguments.length > 1 && last?.getText() === "unknown") {
		base.removeTypeArgument(last);
	}
}

export async function processOpenApiDocument(
	outputDir: string,
	document: Simplify<oas32.OpenAPIObject>,
	tags?: string[],
	options?: CodegenOptions,
) {
	const schema = normalizeRefs(document);
	const project = new Project();
	const files = createOutputFiles(project, outputDir);
	const refs = localRefs(schema);
	const typesImportDecl = addModulePreambles(files);

	const documentCtx: DocumentContext = {
		...files,
		refs,
		openapiVersion: schema.openapi,
		typesImportDecl,
		typesAndInterfaces: new Map(),
		validators: new Map(),
		allOperations: [],
		outputTypes: new Set(),
		inputTypeArgs: new Set(),
		inputTypeNames: new Set(),
		validatedSubclasses: [],
		sequentialOutputs: [],
		validatedReExports: [],
		inputOnly: options?.inputOnly,
	};

	registerComponentSchemas(documentCtx, schema);
	emitOperations(documentCtx, schema, tags);
	emitClientModule(documentCtx, schema);
	emitValidatedModule(documentCtx);
	joinChunks(files.typesFile);
	joinChunks(files.commandsFile);
	joinChunks(files.valibotFile);

	files.mainFile.organizeImports();

	// tidies up any unused type-fest imports
	files.typesFile.fixUnusedIdentifiers();
	files.commandsFile.fixUnusedIdentifiers();
	files.commandsValidatedFile.fixUnusedIdentifiers();
	importLazyTypes(
		files.valibotFile,
		documentCtx.validators,
		typesModuleSpecifierOf(files.typesFile),
	);
	addJsonValueSchemaWhenUsed(files.valibotFile);
	files.valibotFile.fixUnusedIdentifiers();

	const honoFile = emitHonoModule(
		project,
		outputDir,
		documentCtx.allOperations,
	);

	return { ...files, honoFile };
}
