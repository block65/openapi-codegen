check: typecheck lint fmt-check test typecheck-fixtures

typecheck:
	pnpm exec oxlint --type-aware --type-check

lint:
	pnpm exec oxlint

fmt:
	pnpm exec oxfmt

fmt-check:
	pnpm exec oxfmt --check

test:
	pnpm exec vitest run

# reported, not gated: the generator's queryStyles literal leaves two TS2416s
typecheck-fixtures:
	-pnpm exec tsc -p __tests__/tsconfig.json
