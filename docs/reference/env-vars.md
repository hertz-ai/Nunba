# Environment Variables Reference

Complete reference of all environment variables used by Nunba.

## Backend (Python/Flask)

Set in `.env` at the project root.

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `HEVOLVE_DB_PATH` | `~/Documents/Nunba/data/hevolve_database.db` | Main SQLite database path |
| `HARTOS_BACKEND_URL` | `http://localhost:5000` | Internal backend URL |
| `NUNBA_ENV` | `development` | Environment: `development` or `production` |
| `NUNBA_LOCAL_PORT` | `5000` | Flask server port |
| `NUNBA_BUNDLED` | (auto-set) | Set to `1` when running as frozen exe |

### Security

| Variable | Default | Description |
|----------|---------|-------------|
| `NUNBA_API_TOKEN` | (none) | API authentication token |
| `SOCIAL_SECRET_KEY` | (none) | JWT signing key |
| `OPENAI_API_KEY` | (none) | OpenAI API key (cloud LLM only) |

### Services

| Variable | Default | Description |
|----------|---------|-------------|
| `SENTRY_DSN` | (empty) | Sentry error tracking |
| `NUNBA_CRASH_REPORTING` | `true` | Enable/disable crash reporting |
| `SOCIAL_RATE_LIMIT_DISABLED` | `1` (dev) | Disable social API rate limiter |

### LLM

| Variable | Default | Description |
|----------|---------|-------------|
| `LLAMA_MODEL_PATH` | (auto-detected) | Path to GGUF model file |
| `LLAMA_CONTEXT_SIZE` | `4096` | Context window size |
| `LLAMA_GPU_LAYERS` | `0` | Number of GPU offload layers |

### Voice

| Variable | Default | Description |
|----------|---------|-------------|
| `TTS_ENGINE` | `piper` | TTS engine: `piper` or `vibeVoice` |
| `TTS_VOICE` | `en_US-lessac-medium` | Voice model name |
| `HF_TOKEN` | (none) | HuggingFace token (for pyannote diarization) |

### Cloud URLs

| Variable | Default | Description |
|----------|---------|-------------|
| `HAYSTACK_URL` | `http://localhost:8000/haystack/` | Haystack search |
| `GPT3_URL` | `http://localhost:5459/` | GPT-3 endpoint |
| `VICUNA_URL` | `http://localhost:6777/chat` | LangChain agent |
| `CROSSBAR_WS_URL` | `ws://localhost:8088/ws` | WAMP WebSocket |
| `CRAWL4AI_URL` | (none) | Crawl4AI web crawler |

### Node Tiers

| Variable | Default | Description |
|----------|---------|-------------|
| `HEVOLVE_NODE_TIER` | `flat` | Topology: `flat`, `regional`, `central` |
| `HEVOLVE_FORCE_TIER` | (none) | Override capability tier: `lite`, `standard`, `full` |

---

## Frontend (React)

Set in `.env.local` (dev) or `.env.production` (build) inside `landing-page/`.

All must be prefixed with `REACT_APP_`.

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_BASE_URL` | `http://localhost:5000` | Flask backend URL |
| `REACT_APP_SECRET_KEY` | (required) | AES encryption key |

### Cloud

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_CLOUD_API_URL` | `https://azurekong.hertzai.com` | Hevolve cloud API |
| `REACT_APP_MAILER_API_URL` | `https://mailer.hertzai.com` | Email service |
| `REACT_APP_AZURE_API_URL` | `https://azurekong.hertzai.com` | Azure services |
| `REACT_APP_SMS_API_URL` | `https://sms.hertzai.com` | SMS OTP |
| `REACT_APP_SOCIAL_API_URL` | (derived) | Social API override |
| `REACT_APP_CHAT_API_URL` | (derived) | Chat API override |

### Payments

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_PHONEPE_MERCHANT_ID` | (empty) | PhonePe merchant ID |
| `REACT_APP_PHONEPE_SALT_INDEX` | `1` | PhonePe salt index |
| `REACT_APP_PHONEPE_SALT_KEY` | (empty) | PhonePe salt key |

### Monitoring

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_SENTRY_DSN` | (empty) | Sentry DSN |
| `REACT_APP_GA_MEASUREMENT_ID` | (empty) | Google Analytics ID |

---

## Build/CI

| Variable | Context | Description |
|----------|---------|-------------|
| `NUNBA_ENV_KEY` | Build machine | Passphrase for decrypting `.env.production.enc` |
| `CI` | GitHub Actions | Set automatically in CI environments |
