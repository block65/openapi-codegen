import path from "node:path";
import * as oxlint from "oxlint";

// Every module the generator writes. `defineOverrides` scopes the rules below
// to these, and a test holds this list to what a run actually emits
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

				// the generated code carries comments from the spec file, and their
				// content is the document author's to answer for
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
					"unicorn/max-nested-calls": "off",
				},
			},
		],
	}).overrides;
}
