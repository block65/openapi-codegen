# @block65/openapi-codegen

Generates a typed client, valibot schemas and Hono middleware from an OpenAPI
document.

```sh
pnpm exec openapi-codegen -i openapi.json -o src/generated
```

## Peer dependencies of generated code

The generated files import these packages. They are declared as
`peerDependencies` here, so installing this generator reports what is missing —
but the generated code usually lives in a **different** package from the one
that depends on the generator, and nothing can add them to that package's
`package.json` for you. Add them wherever the generated output is compiled and
run.

| package                    | version   | needed by                            |
| -------------------------- | --------- | ------------------------------------ |
| `@block65/rest-client`     | `^14.2.0` | `commands.ts`, `main.ts`, `hono.ts`  |
| `type-fest`                | `^5.10.0` | `commands.ts`, `main.ts`, `types.ts` |
| `valibot`                  | `^1.5.0`  | `valibot.ts`                         |
| `hono`                     | `^4.13.8` | `hono.ts`                            |
| `@hono/standard-validator` | `^0.4.0`  | `hono.ts`                            |

`commands-validated.ts` and `enums.ts` import nothing external.

A client that never serves requests can skip `hono` and
`@hono/standard-validator` by leaving `hono.ts` out of its build. A client that
never validates responses can skip `valibot` the same way.

## Query strings on the server

Generated `hono.ts` validates the query exactly as Hono parsed it. It decodes
nothing, so these encodings reach the schema in a shape the schema rejects:

| sent          | Hono gives the validator | schema wants        |
| ------------- | ------------------------ | ------------------- |
| `?tags=cat`   | `"cat"`                  | an array            |
| `?tags=a,b`   | `"a,b"`                  | `["a", "b"]`        |
| `?tags=a%20b` | `"a b"`                  | `["a", "b"]`        |
| `?tags=a      | b`                       | `"a                 | b"` | `["a", "b"]` |
| `?at[gt]=1`   | key `"at[gt]"`           | `{ at: { gt: 1 } }` |

A single value for a repeated-key array is the common one, and it is what a
client sends for a one-item array.

A rejected query throws `PublicValidationError`, so the status a caller sees
is whatever its own error handler returns for that error.

A consumer whose clients send any of these decodes the query before the
generated middleware validates it, or supplies its own middleware in place of
the generated one. The per-operation query spec is exported for that purpose,
carrying the `style` and `explode` each parameter declares:

```ts
import { listPetsQueryParams } from "./generated/hono.ts";
```

The client half is already handled: a generated command names the
`@block65/rest-client` serializer for the style its document states, and
inherits `formExplodeSerializer` — form with explode, the OpenAPI default —
when it names none. One serializer covers a whole operation, so an operation
whose query parameters need two of them stops generation.

## Linting generated output

The generated JSDoc is transcribed from the OpenAPI document, so the prose is
the document author's and the comment rules judge it unfairly. The package
ships an override for that, scoped to wherever the output lives:

```ts
import { defineConfig } from "@block65/shared-config/oxlint";
import * as codegen from "@block65/openapi-codegen/oxlint";

export default defineConfig({
	overrides: [...codegen.defineOverrides("src/generated/*")],
});
```

It turns off comment rules only. Anything else the generated output trips is a
bug in the generator, so report it rather than adding it to the override.

## Object strictness comes from the document

`additionalProperties: false` emits `v.strictObject`, which rejects unknown
keys. An absent `additionalProperties` emits `v.looseObject`, because JSON
Schema allows unknown keys by default and the generated client follows the
document. Declare `additionalProperties: false` on a schema that is meant to be
closed.

Path and query parameters are always strict, because an OpenAPI parameter list
is exhaustive.
