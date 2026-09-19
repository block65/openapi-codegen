# https://just.systems

_default: typecheck

# typecheck with tsc
typecheck:
	pnpm exec tsc

# reported, not gated: the two TS2416s are the generator's queryStyles literal
typecheck-fixtures:
	-pnpm exec tsc -p __tests__/tsconfig.json

# lint
lint:
	pnpm exec oxlint

# typecheck, then run the test suite
test: typecheck typecheck-fixtures
	pnpm exec vitest run

# apply lint fixes, then format even if oxlint leaves what it cannot fix
pretty:
	-pnpm exec oxlint --fix
	pnpm exec oxfmt

# report formatting that pretty would change
pretty-check:
	pnpm exec oxfmt --check

# what CI runs
check: typecheck lint pretty-check test

# remove installed dependencies
dist-clean:
	rm -rf node_modules
