#!/usr/bin/env bash
set -euo pipefail

corepack yarn install

if git rev-parse --git-dir >/dev/null 2>&1; then
	HOOKS_PATH="$(git config --get core.hooksPath || true)"
	if [[ -n "$HOOKS_PATH" ]]; then
		corepack yarn husky install "$HOOKS_PATH"
	else
		corepack yarn husky install
	fi
fi
