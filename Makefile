
SRCS = $(wildcard lib/**)

all: dist

.PHONY: deps
deps: node_modules

.PHONY: clean
clean:
	pnpm exec tsc -b --clean
	rm -rf dist
	rm -rf __tests__/dist
	rm __tests__/fixtures/*/*.ts

.PHONY: test
test: node_modules
	pnpm exec tsc -b
	pnpm exec vitest

node_modules: package.json
	pnpm install

dist: node_modules tsconfig.json $(SRCS)
	pnpm exec tsc

.PHONY: dev
dev:
	pnpm tsc -b -w

.PHONY: fixtures
fixtures: dist
	$(MAKE) petstore test1 openai

.PHONY: petstore
petstore:  __tests__/fixtures/petstore.json dist
	node --enable-source-maps dist/bin/index.js \
		-i $< \
		-o __tests__/fixtures/petstore
	pnpm exec prettier --write __tests__/fixtures/petstore

.PHONY: test1
test1:  __tests__/fixtures/test1.json dist
	node --enable-source-maps dist/bin/index.js \
		-i $< \
		-o __tests__/fixtures/test1
	pnpm exec prettier --write __tests__/fixtures/test1


__tests__/fixtures/openai.json: __tests__/fixtures/openai.yaml
	mkdir -p $(@D)
	pnpm exec js-yaml $< > $@

__tests__/fixtures/openai.yaml: __tests__/fixtures/openai.yaml
	curl https://raw.githubusercontent.com/openai/openai-openapi/refs/heads/master/openapi.yaml --output $@

.PHONY: openai
openai: __tests__/fixtures/openai.json dist
	node --enable-source-maps dist/bin/index.js \
		-i $< \
		-o __tests__/fixtures/openai
	pnpm exec prettier --write __tests__/fixtures/openai

# .PHONY: cloudflare
# cloudflare: __tests__/fixtures/cloudflare/openapi.json dist
# 	node --enable-source-maps dist/bin/index.js \
# 		-i __tests__/fixtures/cloudflare/openapi.json \
# 		-o __tests__/fixtures/cloudflare
# 	pnpm prettier --write __tests__/fixtures/cloudflare

.PHONY: pretty
pretty: node_modules
	pnpm exec eslint --fix . || true
	pnpm exec prettier --write .
