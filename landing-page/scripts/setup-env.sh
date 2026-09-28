#!/usr/bin/env bash
# Compatibility entry point for callers that invoke the shell script directly.
# setup-env.cjs owns the environment setup behavior on every platform.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$SCRIPT_DIR/setup-env.cjs" --portable
