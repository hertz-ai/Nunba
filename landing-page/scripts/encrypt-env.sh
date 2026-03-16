#!/usr/bin/env bash
# ============================================================================
# encrypt-env.sh — Encrypt .env.production for safe storage in git
#
# The encrypted file (.env.production.enc) IS committed to the private repo.
# Only people with NUNBA_ENV_KEY can decrypt it.
#
# Usage:
#   NUNBA_ENV_KEY=<passphrase> ./scripts/encrypt-env.sh
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_PROD="$PROJECT_DIR/.env.production"
ENV_ENC="$PROJECT_DIR/.env.production.enc"

if [ -z "$NUNBA_ENV_KEY" ]; then
  echo "Error: Set NUNBA_ENV_KEY environment variable."
  echo "Usage: NUNBA_ENV_KEY=your-passphrase ./scripts/encrypt-env.sh"
  exit 1
fi

if [ ! -f "$ENV_PROD" ]; then
  echo "Error: .env.production not found. Create it first."
  exit 1
fi

openssl enc -aes-256-cbc -pbkdf2 -in "$ENV_PROD" -out "$ENV_ENC" -pass "pass:$NUNBA_ENV_KEY"
echo "[encrypt-env] Encrypted .env.production → .env.production.enc"
echo "[encrypt-env] You can now commit .env.production.enc to git."
