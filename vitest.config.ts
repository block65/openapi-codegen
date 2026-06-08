import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// no timeouts: a wrong mock should fail loudly on assertion or hang
		// visibly, not get masked by a timer racing retry backoff
		testTimeout: 0,
		hookTimeout: 0,
	},
});