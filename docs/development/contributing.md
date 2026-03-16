# Contributing

Contributions to Nunba are welcome. This guide covers the workflow and conventions.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/nunba.git
   cd nunba
   ```
3. Follow the [installation guide](../getting-started/install.md)
4. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Branch Naming

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New functionality | `feature/voice-commands` |
| `fix/` | Bug fix | `fix/login-redirect` |
| `refactor/` | Code cleanup | `refactor/api-client` |
| `docs/` | Documentation | `docs/setup-guide` |
| `test/` | Test additions | `test/agent-creation` |

## Code Style

### Python

- **Linter**: Ruff (configured in `ruff.toml`)
- **Security**: Ruff's bandit rules (S prefix) for SAST
- Run: `ruff check .`

### JavaScript/React

- **Linter**: ESLint with security plugin
- **Formatter**: Prettier
- Run: `cd landing-page && npm run lint`

### Pre-commit Hooks

Install pre-commit hooks to auto-check before committing:

```bash
pip install pre-commit
pre-commit install
```

Hooks run:
- Ruff (Python lint + security)
- detect-secrets (prevent committing credentials)
- trailing-whitespace, check-yaml, check-json

## Pull Request Process

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. Run tests:
   ```bash
   # Python
   ruff check .

   # Frontend
   cd landing-page
   npm run lint
   npx cypress run --browser chrome
   ```

3. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a PR on GitHub with:
   - Clear title (< 70 characters)
   - Description of what changed and why
   - Test plan (how to verify the change works)

## PR Format

```markdown
## Summary
- What this PR does (1-3 bullet points)

## Test Plan
- [ ] How to test change 1
- [ ] How to test change 2

## Screenshots (if UI change)
```

## Important Conventions

### MUI Components

- Use `sx` prop for styling (not `makeStyles`)
- Numeric `borderRadius` in `sx` is a theme spacing multiplier — use string values like `'16px'`
- All `dangerouslySetInnerHTML` must be wrapped with `DOMPurify.sanitize()`

### API Clients

- Use `createApiClient()` from `src/services/axiosFactory.js`
- All API base URLs come from `src/config/apiBase.js`
- Never hardcode API URLs in components

### Environment Variables

- Frontend vars must be prefixed with `REACT_APP_`
- Always provide a fallback: `process.env.REACT_APP_X || 'default'`
- Add new vars to `.env.example`

### Security

- No `console.log` with tokens or secrets
- No hardcoded credentials
- Use `encryption.js` for client-side crypto
- Validate all user input at system boundaries
