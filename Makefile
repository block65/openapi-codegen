
SRCS = $(wildcard lib/**)

all: typecheck

.PHONY: deps
deps: node_modules

.PHONY: distclean
distclean:
	rm -rf node_modules

.PHONY: typecheck
typecheck: node_modules tsconfig.json $(SRCS)
	pnpm exec tsc

# The generated fixtures under __tests__/fixtures are typechecked on their own
# tsconfig, and reported rather than gated: one known error survives there (an
# OpenAI `deepObject` query parameter) whose fix belongs in @block65/rest-client
.PHONY: typecheck-fixtures
typecheck-fixtures: node_modules __tests__/tsconfig.json
	-pnpm exec tsc -p __tests__/tsconfig.json

.PHONY: test
test: node_modules typecheck typecheck-fixtures
	pnpm exec vitest run

node_modules: package.json
	pnpm install

.PHONY: fixtures
fixtures:
	$(MAKE) petstore test1 openai docker

.PHONY: petstore
petstore:  __tests__/fixtures/petstore.json
	node --enable-source-maps bin/index.ts \
		-i $< \
		-o __tests__/fixtures/petstore
	pnpm exec oxfmt --write __tests__/fixtures/petstore

.PHONY: test1
test1:  __tests__/fixtures/test1.json
	node --enable-source-maps bin/index.ts \
		-i $< \
		-o __tests__/fixtures/test1
	pnpm exec oxfmt --write __tests__/fixtures/test1


__tests__/fixtures/openai.json: __tests__/fixtures/openai.yaml
	mkdir -p $(@D)
	pnpm exec js-yaml $< > $@

__tests__/fixtures/openai.yaml:
	curl https://raw.githubusercontent.com/openai/openai-openapi/refs/heads/master/openapi.yaml --output $@

.PHONY: openai
openai: __tests__/fixtures/openai.json
	node --enable-source-maps bin/index.ts \
		-i $< \
		-o __tests__/fixtures/openai
	pnpm exec oxfmt --write __tests__/fixtures/openai

.PHONY: docker
docker: __tests__/fixtures/docker.json
	node --enable-source-maps bin/index.ts \
		-i $< \
		-o __tests__/fixtures/docker
	pnpm exec oxfmt --write __tests__/fixtures/docker

.PHONY: pretty
pretty: node_modules
	pnpm exec oxlint --fix . || true
	pnpm exec oxfmt --write .
