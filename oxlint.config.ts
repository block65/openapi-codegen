import { defineConfig } from "@block65/shared-config/oxlint";

export default defineConfig({
	// a consumer's config enables the valibot group, so the fixtures lint under it
	groups: { vitest: "on", valibot: "on" },

	overrides: [
		{
			// the fixture documents are third-party specs that leave objects open,
			// and a consumer closes theirs with `additionalProperties: false`
			files: ["__tests__/fixtures/**"],
			rules: { "block65/prefer-strict-object": "off" },
		},
	],
});
