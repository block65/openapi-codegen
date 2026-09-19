# Codegen only. Task running is in the justfile, so bare `make` regenerates.
#
# A fixture is built from a document by this generator, so both are
# prerequisites: editing a document rebuilds that fixture, editing the
# generator rebuilds all of them. lib/build.ts rewrites the manifest on every
# run, which makes it a dependable stamp for the whole output directory.

CODEGEN := bin/index.ts $(wildcard lib/*.ts)
FIXTURES := __tests__/fixtures
MANIFEST := .openapi-codegen-manifest.json
DOCUMENTS := petstore test1 openai docker
STAMPS := $(DOCUMENTS:%=$(FIXTURES)/%/$(MANIFEST))

.DEFAULT_GOAL := fixtures

# a half-written document would otherwise satisfy the rule that produced it
.DELETE_ON_ERROR:

.PHONY: fixtures
fixtures: $(STAMPS)

$(FIXTURES)/%/$(MANIFEST): $(FIXTURES)/%.json $(CODEGEN)
	node --enable-source-maps bin/index.ts \
		-i $< \
		-o $(@D)
	pnpm exec oxfmt --write $(@D)

# the generator reads json, and openai publishes yaml
$(FIXTURES)/openai.json: $(FIXTURES)/openai.yaml
	mkdir -p $(@D)
	pnpm exec js-yaml $< > $@

$(FIXTURES)/openai.yaml:
	curl https://raw.githubusercontent.com/openai/openai-openapi/refs/heads/master/openapi.yaml --output $@

# `make petstore` reads better than the stamp path
.PHONY: $(DOCUMENTS)
$(DOCUMENTS): %: $(FIXTURES)/%/$(MANIFEST)
