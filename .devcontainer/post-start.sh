#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "[devcontainer] .git not found in workspace; skipping hook verification."
  exit 0
fi

HOOKS_PATH="$(git config --get core.hooksPath || true)"

if [[ -z "$HOOKS_PATH" ]]; then
  HOOKS_PATH=".git/hooks"
fi

if [[ -x "$HOOKS_PATH/pre-commit" ]]; then
  echo "[devcontainer] Husky pre-commit hook is ready at $HOOKS_PATH/pre-commit."
else
  echo "[devcontainer] Husky pre-commit hook missing at $HOOKS_PATH/pre-commit. Run './.devcontainer/post-create.sh' to reinstall dependencies and hooks."
fi
