SHELL := /bin/zsh
NPM_CMD ?= npm

.PHONY: help build install test pack bump-pre clean docs
 
update:
	@echo "==> Checking outdated deps (mcp-framework)"
	@$(NPM_CMD) outdated || true
	@echo "==> Updating dependencies (mcp-framework)"
	@$(NPM_CMD) update
	@$(NPM_CMD) install


help:
	@echo "Makefile for mcp-framework"
	@echo "Targets: build, install, test, pack, bump-pre, clean, docs"

build:
	@echo "==> Building mcp-framework"
	@$(NPM_CMD) ci
	@$(NPM_CMD) run build

install:
	@echo "==> Installing dependencies (mcp-framework)"
	@$(NPM_CMD) ci

test:
	@echo "==> Running tests (mcp-framework)"
	@$(NPM_CMD) test

pack:
	@echo "==> Creating package tarball (mcp-framework)"
	@$(NPM_CMD) pack

bump-pre:
	@echo "==> Bumping prerelease (mcp-framework)"
	@$(NPM_CMD) version prerelease --preid=pre

clean:
	@echo "==> Cleaning (mcp-framework)"
	@rm -rf node_modules dist *.tgz || true

docs:
	@echo "==> Building API documentation (mcp-framework)"
	@$(NPM_CMD) run docs:api
	@echo "==> Building MkDocs site (mcp-framework)"
	@$(NPM_CMD) run docs:build
