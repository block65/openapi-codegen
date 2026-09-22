import path from "node:path";
import * as oxlint from "oxlint";

// Every module the generator writes. `defineOverrides` limits the rules
// below to these, and a test compares this list with what a run emits
export const generatedFiles = [
	"commands.ts",
	"commands-validated.ts",
	"enums.ts",
	"hono.ts",
	"main.ts",
	"types.ts",
	"valibot.ts",
] as const;

export function defineOverrides<T extends oxlint.OxlintOverride>(
	root: string,
	overrides: T[] = [],
) {
	return oxlint.defineConfig({
		overrides: [
			...overrides,
			{
				files: generatedFiles.map((name) => path.join(root, name)),

				// the generated comments come from the spec file, so their content
				// is the document author's
				rules: {
					"block65/no-jsdoc-on-statement": "off",
					"block65/no-bare-block-comment": "off",
					"block65/declaration-comments": "off",
					"block65/no-comment-divider": "off",
					"block65/no-comment-history": "off",
					"block65/no-negated-comment": "off",
					"block65/no-narrative-comment": "off",
					"block65/no-jargon-comment": "off",
					"block65/no-padded-comment": "off",
					"block65/no-figurative-comment": "off",
					"block65/no-absence-comment": "off",
					"block65/no-comment-overclaim": "off",
					"block65/no-hedging-comment": "off",
					"block65/no-assumption-comment": "off",
					"block65/no-overconfident-comment": "off",
					"block65/no-placeholder-comment": "off",
					"block65/no-banned-comment-words": "off",
					"block65/no-comment-list": "off",
					"block65/no-comment-punctuation": "off",
					"block65/no-trailing-comment-punctuation": "off",
					"block65/no-file-reference-in-comment": "off",
					"block65/no-file-header-comment": "off",
					"block65/max-comment-lines": "off",
					"block65/require-comment-blank-line": "off",
					"unicorn-unported/comment-content": "off",

					// a query parameter named `t` or `q` is the document's wire
					// contract, so the generated code destructures that name
					"block65/no-single-character-declaration": "off",
					"unicorn/max-nested-calls": "off",

					// property spelling is the document's wire contract too
					"block65/snake-case-wire-keys": "off",

					// an object schema is open unless the document sets
					// `additionalProperties: false`, so `looseObject` accepts the
					// unnamed keys a peer may send
					"block65/prefer-strict-object": "off",

					// input schemas face TS callers, who may pass an explicit
					// `undefined` for an absent member. The wire schemas use
					// `exactOptional`
					"block65/prefer-exact-optional": "off",
				},
			},
		],
	}).overrides;
}
