# Codegen only: the fixtures are files built from other files, which is the one
# job here that wants a dependency graph. Task running is in the justfile, so
# bare `make` regenerates rather than typechecks

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
