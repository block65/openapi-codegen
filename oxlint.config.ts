import { defineConfig } from "@block65/shared-config/oxlint";

export default defineConfig({
	// Generated output. Its JSDoc is transcribed from the OpenAPI document, so
	// the prose rules would judge whoever wrote that document
	ignorePatterns: ["__tests__/fixtures/**"],

	groups: { vitest: "on" },
});
