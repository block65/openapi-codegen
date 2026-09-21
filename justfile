check: typecheck lint fmt-check test typecheck-fixtures

typecheck:
	pnpm exec oxlint --type-aware --type-check

lint:
	pnpm exec oxlint

# annotates the changed lines in a pull request
lint-ci:
	pnpm exec oxlint --format=github

fmt:
	pnpm exec oxfmt

fmt-check:
	pnpm exec oxfmt --check

test:
	pnpm exec vitest run

typecheck-fixtures:
	pnpm exec tsc -p __tests__/tsconfig.json
