import { defineConfig } from "@block65/shared-config/oxlint";
import * as codegenPlugin from "./lib/oxlint.ts";

export default defineConfig({
	groups: { vitest: "on" },

	overrides: codegenPlugin.defineOverrides("__tests__/fixtures/*"),
});
