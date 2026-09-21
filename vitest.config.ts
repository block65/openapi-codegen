import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// a wrong mock should fail loudly on assertion or hang visibly, where a
		// timer racing retry backoff would mask it
		testTimeout: 0,
		hookTimeout: 0,
	},
});
