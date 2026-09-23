import { defineConfig } from "@block65/shared-config/oxlint";

export default defineConfig({
	// a consumer's config enables the valibot group, so the fixtures lint under it
	groups: { vitest: "on", valibot: "on" },
});
