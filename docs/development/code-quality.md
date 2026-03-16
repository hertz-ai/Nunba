# Code Quality

Nunba uses automated tools for linting, security scanning, and formatting.

## Python: Ruff

[Ruff](https://docs.astral.sh/ruff/) is the Python linter, configured in `ruff.toml`.

```bash
# Check for issues
ruff check .

# Auto-fix
ruff check --fix .
```

### Enabled Rules

| Code | Category | Description |
|------|----------|-------------|
| E, W | pycodestyle | Style errors and warnings |
| F | pyflakes | Unused imports, undefined names |
| I | isort | Import sorting |
| S | bandit | Security (SAST) — SQL injection, hardcoded passwords, etc. |
| B | bugbear | Common bugs and design issues |

### Bandit Security Rules (S prefix)

These rules catch security vulnerabilities equivalent to commercial SAST tools:

- `S101` — assert used in production
- `S105` — hardcoded password
- `S110` — bare except (catches keyboard interrupt)
- `S301` — pickle usage (deserialization attack)
- `S608` — SQL injection via string formatting

## JavaScript: ESLint + Security Plugin

```bash
cd landing-page
npm run lint           # Check
npm run lint:fix       # Auto-fix
```

### Configuration

ESLint is configured with:
- `eslint-config-google` — Google style guide
- `eslint-config-prettier` — Disables rules that conflict with Prettier
- `eslint-plugin-security` — Detects security issues (RegExp DOS, eval, etc.)

## Formatting: Prettier

```bash
cd landing-page
npx prettier --check "src/**/*.{js,jsx}"
npx prettier --write "src/**/*.{js,jsx}"   # Auto-format
```

## Pre-commit Hooks

Install once:
```bash
pip install pre-commit
pre-commit install
```

Runs automatically on every `git commit`:

| Hook | What It Does |
|------|-------------|
| `ruff` | Python lint + security |
| `detect-secrets` | Prevents committing API keys, passwords |
| `trailing-whitespace` | Removes trailing whitespace |
| `check-yaml` | Validates YAML files |
| `check-json` | Validates JSON files |
| `end-of-file-fixer` | Ensures files end with newline |

## CI/CD Quality Gate

`.github/workflows/quality.yml` runs on every push and PR:

```yaml
jobs:
  python-quality:
    - ruff check .
    - pip-audit  # Check for known vulnerabilities in dependencies

  frontend-quality:
    - npm run lint
    - npm audit --audit-level=high
```

Both must pass for a PR to be mergeable.

## Security Practices

### XSS Prevention

All `dangerouslySetInnerHTML` usage is wrapped with DOMPurify:

```javascript
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
```

### No Console Logging of Secrets

Token logging was removed from all auth flows. Never log:
- JWT tokens
- API keys
- Passwords
- Secret keys

### Environment Variable Security

- Production secrets are encrypted (`.env.production.enc`)
- `.env` files are gitignored
- `.env.example` contains only placeholder values
- Pre-commit `detect-secrets` hook catches accidental commits
