
SRCS = $(wildcard lib/**)

all: dist

.PHONY: deps
deps: node_modules

.PHONY: clean
clean:
	yarn tsc -b --clean
	rm -rf dist

.PHONY: test
test:
	NODE_OPTIONS=--experimental-vm-modules yarn jest

node_modules: package.json
	yarn install

dist: node_modules tsconfig.json $(SRCS)
	yarn tsc

.PHONY: dev
dev:
	yarn tsc -w

.PHONY: fixtures
fixtures: __tests__/fixtures/petstore.json
	node --enable-source-maps dist/bin/index.js \
		-i __tests__/fixtures/petstore.json \
		-o __tests__/fixtures/petstore
	yarn prettier --write __tests__/fixtures/petstore