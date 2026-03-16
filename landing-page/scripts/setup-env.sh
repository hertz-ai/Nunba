#!/usr/bin/env bash
# ============================================================================
# setup-env.sh — Auto-create .env.production from encrypted secrets
#
# For Hevolve private repo builds:
#   Decrypts .env.production.enc → .env.production using NUNBA_ENV_KEY
#
# For OSS contributors:
#   Copies .env.example → .env.local if no env file exists
#
# Usage:
#   NUNBA_ENV_KEY=<passphrase> ./scripts/setup-env.sh
#   npm run setup-env   (reads NUNBA_ENV_KEY from environment)
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_PROD="$PROJECT_DIR/.env.production"
ENV_ENC="$PROJECT_DIR/.env.production.enc"
ENV_LOCAL="$PROJECT_DIR/.env.local"
ENV_EXAMPLE="$PROJECT_DIR/.env.example"

# --- Option 1: Decrypt .env.production.enc (Hevolve private builds) ---
if [ -f "$ENV_ENC" ] && [ -n "$NUNBA_ENV_KEY" ]; then
  echo "[setup-env] Decrypting .env.production from encrypted file..."
  openssl enc -aes-256-cbc -d -pbkdf2 -in "$ENV_ENC" -out "$ENV_PROD" -pass "pass:$NUNBA_ENV_KEY"
  echo "[setup-env] .env.production created successfully."
  exit 0
fi

# --- Option 2: .env.production already exists (manual setup) ---
if [ -f "$ENV_PROD" ]; then
  echo "[setup-env] .env.production already exists, skipping."
  exit 0
fi

# --- Option 3: .env.local already exists (OSS contributor) ---
if [ -f "$ENV_LOCAL" ]; then
  echo "[setup-env] .env.local already exists, skipping."
  exit 0
fi

# --- Option 4: First-time OSS contributor — copy .env.example ---
if [ -f "$ENV_EXAMPLE" ]; then
  echo "[setup-env] No env file found. Copying .env.example → .env.local"
  echo "[setup-env] Edit .env.local to configure your environment."
  cp "$ENV_EXAMPLE" "$ENV_LOCAL"
  exit 0
fi

echo "[setup-env] Warning: No .env.example found. Create one or set NUNBA_ENV_KEY."
exit 0
