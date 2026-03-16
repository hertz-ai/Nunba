# Frontend Environment Variables

The React frontend uses Create React App's built-in environment variable system. All variables must be prefixed with `REACT_APP_`.

## How CRA Environment Variables Work

1. Variables are read from `.env*` files **at build time**
2. They are injected into the JavaScript bundle as string literals
3. Access them in code via `process.env.REACT_APP_*`
4. They cannot be changed after the build — you must rebuild

### File Priority (highest first)

**During `npm start` (development):**

1. `.env.development.local`
2. `.env.local`
3. `.env.development`
4. `.env`

**During `npm run build` (production):**

1. `.env.production.local`
2. `.env.local`
3. `.env.production`
4. `.env`

## Complete Variable Reference

### Core API

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_BASE_URL` | `http://localhost:5000` | Flask backend base URL. All API calls go here. |
| `REACT_APP_SOCIAL_API_URL` | (derived from API_BASE_URL) | Social API override. Usually not needed. |
| `REACT_APP_CHAT_API_URL` | (derived from API_BASE_URL) | Chat API override. Usually not needed. |

### Cloud Services

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_CLOUD_API_URL` | `https://azurekong.hertzai.com` | Hevolve cloud API for online features |
| `REACT_APP_MAILER_API_URL` | `https://mailer.hertzai.com` | Email sending service |
| `REACT_APP_AZURE_API_URL` | `https://azurekong.hertzai.com` | Azure cognitive services endpoint |
| `REACT_APP_SMS_API_URL` | `https://sms.hertzai.com` | SMS OTP verification service |

!!! note
    Cloud URLs are only needed for online features (OTP auth, email, cloud AI). For fully offline use, leave them empty.

### Security

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_SECRET_KEY` | **(required)** | AES encryption key for client-side data encryption. Generate with `node src/pages/generateKey.js` |

### Payments (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_PHONEPE_MERCHANT_ID` | (empty) | PhonePe payment gateway merchant ID |
| `REACT_APP_PHONEPE_SALT_INDEX` | `1` | PhonePe salt index |
| `REACT_APP_PHONEPE_SALT_KEY` | (empty) | PhonePe salt key for checksum |

### Monitoring (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_SENTRY_DSN` | (empty) | Sentry error tracking DSN. If empty, Sentry is disabled. |
| `REACT_APP_GA_MEASUREMENT_ID` | (empty) | Google Analytics measurement ID. If empty, analytics is disabled. |

## Where Variables Are Used

| Variable | File(s) | How Used |
|----------|---------|----------|
| `REACT_APP_API_BASE_URL` | `src/config/apiBase.js` | Base URL for all axios instances |
| `REACT_APP_SECRET_KEY` | `src/utils/encryption.js` | AES-256 key for encrypt/decrypt |
| `REACT_APP_SENTRY_DSN` | `src/hooks/useCrashReporter.js` | Sentry.init() DSN |
| `REACT_APP_GA_MEASUREMENT_ID` | `src/App.js` | ReactGA.initialize() |
| `REACT_APP_PHONEPE_*` | `src/components/config.js` | Payment checksum generation |
| `REACT_APP_CLOUD_API_URL` | `src/config/apiBase.js` | Cloud API routing |

## Adding a New Environment Variable

1. Add the variable to `.env.example` with a comment
2. Add a fallback in the code: `process.env.REACT_APP_NEW_VAR || 'default'`
3. If it's a secret, add it to `.env.production` and re-encrypt
4. Document it in this file
