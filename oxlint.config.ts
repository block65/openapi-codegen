import { defineConfig } from "@block65/shared-config/oxlint";

export default defineConfig({
	// generated code under test, compared byte for byte
	ignorePatterns: ["__tests__/__snapshots__/**"],

	// a consumer's config enables the valibot group, so the fixtures lint under it
	groups: { vitest: "on", valibot: "on" },

	overrides: [
		{
			// third-party documents that leave their objects open
			files: [
				"__tests__/fixtures/docker/valibot.ts",
				"__tests__/fixtures/openai/valibot.ts",
				"__tests__/fixtures/petstore/valibot.ts",
			],
			rules: { "block65/prefer-strict-object": "off" },
		},
	],
});
