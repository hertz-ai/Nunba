# Environment Configuration

Nunba uses environment variables for configuration. There are two separate sets:

1. **Backend** (Python/Flask) — `.env` in the project root
2. **Frontend** (React) — `.env.local` in `landing-page/`

## Backend Environment

### Step 1: Create `.env` from the template

```bash
# From project root
cp .env.example .env
```

### Step 2: Edit `.env`

Open `.env` in your editor and configure:

```bash
# === REQUIRED ===

# Leave empty to auto-create at ~/Documents/Nunba/data/hevolve_database.db
HEVOLVE_DB_PATH=

# Backend URL (default is fine for local development)
HARTOS_BACKEND_URL=http://localhost:5000

# Security keys — generate random strings for production
NUNBA_API_TOKEN=change-me-to-a-random-string
SOCIAL_SECRET_KEY=change-me-to-a-random-string

# === OPTIONAL ===

# Set to "production" for release builds
NUNBA_ENV=development

# Sentry error reporting (leave empty to disable)
SENTRY_DSN=

# OpenAI key (only needed for cloud LLM mode)
# OPENAI_API_KEY=sk-...
```

!!! tip "Minimal setup"
    For local development, you only need to set `NUNBA_API_TOKEN` and `SOCIAL_SECRET_KEY` to any random strings. Everything else has sensible defaults.

### Backend Environment Reference

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `HEVOLVE_DB_PATH` | `~/Documents/Nunba/data/hevolve_database.db` | No | SQLite database path |
| `HARTOS_BACKEND_URL` | `http://localhost:5000` | No | Backend URL for internal routing |
| `NUNBA_API_TOKEN` | (none) | Yes | API authentication token |
| `SOCIAL_SECRET_KEY` | (none) | Yes | JWT signing key for social auth |
| `NUNBA_ENV` | `development` | No | `development` or `production` |
| `SENTRY_DSN` | (empty) | No | Sentry error tracking DSN |
| `OPENAI_API_KEY` | (empty) | No | OpenAI API key for cloud LLM |
| `TTS_ENGINE` | `piper` | No | TTS engine: `piper` or `vibeVoice` |
| `TTS_VOICE` | `en_US-lessac-medium` | No | Piper voice model name |
| `LLAMA_MODEL_PATH` | (auto-detected) | No | Path to GGUF model file |
| `LLAMA_CONTEXT_SIZE` | `4096` | No | LLM context window tokens |
| `LLAMA_GPU_LAYERS` | `0` | No | GPU layers for llama.cpp |
| `SOCIAL_RATE_LIMIT_DISABLED` | `1` (dev mode) | No | Disable rate limiter in dev |

---

## Frontend Environment

### Step 1: Create `.env.local` from the template

```bash
cd landing-page
cp .env.example .env.local
```

### Step 2: Generate an encryption key

The frontend encrypts certain data before sending to the backend. Generate a key:

```bash
node src/pages/generateKey.js
```

Copy the output and paste it as `REACT_APP_SECRET_KEY` in `.env.local`.

### Step 3: Edit `.env.local`

```bash
# === REQUIRED ===

# Local Flask backend URL
REACT_APP_API_BASE_URL=http://localhost:5000

# Encryption key (from step 2)
REACT_APP_SECRET_KEY=your-generated-key-here

# === OPTIONAL (leave commented for local-only mode) ===

# Hevolve Cloud API
# REACT_APP_CLOUD_API_URL=https://azurekong.hertzai.com

# Monitoring
# REACT_APP_SENTRY_DSN=https://key@sentry.io/project
# REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Payments (PhonePe — India only)
# REACT_APP_PHONEPE_MERCHANT_ID=
# REACT_APP_PHONEPE_SALT_INDEX=1
# REACT_APP_PHONEPE_SALT_KEY=
```

### Frontend Environment Reference

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `REACT_APP_API_BASE_URL` | `http://localhost:5000` | Yes | Local Flask backend URL |
| `REACT_APP_SECRET_KEY` | (none) | Yes | Encryption key for client-side crypto |
| `REACT_APP_CLOUD_API_URL` | (empty) | No | Hevolve cloud API URL |
| `REACT_APP_MAILER_API_URL` | (empty) | No | Email service URL |
| `REACT_APP_AZURE_API_URL` | (empty) | No | Azure cognitive services URL |
| `REACT_APP_SMS_API_URL` | (empty) | No | SMS OTP service URL |
| `REACT_APP_SOCIAL_API_URL` | (empty) | No | Social API override |
| `REACT_APP_CHAT_API_URL` | (empty) | No | Chat API override |
| `REACT_APP_SENTRY_DSN` | (empty) | No | Sentry error tracking |
| `REACT_APP_GA_MEASUREMENT_ID` | (empty) | No | Google Analytics ID |
| `REACT_APP_PHONEPE_MERCHANT_ID` | (empty) | No | PhonePe payment merchant ID |
| `REACT_APP_PHONEPE_SALT_INDEX` | `1` | No | PhonePe salt index |
| `REACT_APP_PHONEPE_SALT_KEY` | (empty) | No | PhonePe salt key |

!!! info "CRA environment variables"
    React (Create React App) only reads variables prefixed with `REACT_APP_`. They are **baked into the JavaScript bundle at build time**, not read at runtime.

    - `npm start` reads `.env.local` (dev)
    - `npm run build` reads `.env.production` or `.env.local` (prod)

---

## Hevolve Team: Encrypted Production Secrets

If you are part of the Hevolve team and have the `NUNBA_ENV_KEY` passphrase:

```bash
# The .env.production.enc file in the repo contains encrypted production secrets.
# Decryption happens automatically during `npm run build`:

export NUNBA_ENV_KEY="your-passphrase"
cd landing-page
npm run build   # prebuild hook auto-decrypts → .env.production
```

To update the encrypted secrets after editing `.env.production`:

```bash
export NUNBA_ENV_KEY="your-passphrase"
npm run encrypt-env
```

See [Encrypted Secrets](../frontend/encrypted-secrets.md) for details.

## Next Step

Proceed to [First Run](first-run.md) to start the application.
