# Testing

Nunba uses Cypress for end-to-end testing of the React frontend.

## Test Suite Overview

- **Framework**: Cypress 15.10.0
- **Spec files**: 30
- **Total tests**: ~1100
- **Browser**: Chrome (headless or interactive)

## Running Tests

### Interactive Mode (recommended for development)

```bash
cd landing-page
npx cypress open
```

Opens the Cypress Test Runner UI. Select a spec file to run.

### Headless Mode (CI)

```bash
cd landing-page
npx cypress run --browser chrome
# or
npm run e2e
```

### With Code Coverage

Run the dev server with Istanbul instrumentation, then run Cypress:

```bash
cd landing-page

# Terminal 1: Start instrumented dev server
npm run start:coverage

# Terminal 2: Run Cypress (collects coverage data)
npm run e2e:coverage
```

Coverage report is generated in `landing-page/coverage/` (open `index.html`).

### HTML Test Reports

Cypress generates Mochawesome HTML reports automatically on every run.

After running tests, open `landing-page/cypress/reports/index.html` to view:

- Pass/fail summary with charts
- Individual test details with timing
- Embedded screenshots for failures

### Run a Single Spec

```bash
npx cypress run --spec "cypress/e2e/auth-flow.cy.js" --browser chrome
```

## Test Categories

| Category | Specs | Tests | Description |
|----------|-------|-------|-------------|
| Auth flows | 3 | ~60 | Login, registration, OTP, guest mode |
| Social feed | 4 | ~80 | Posts, comments, likes, feed |
| Agent creation | 2 | ~70 | Manual + autonomous agent creation |
| Admin panel | 3 | ~50 | User management, moderation |
| Voice pipeline | 1 | 90 | STT, TTS, diarization |
| Kids learning | 2 | ~40 | Games, adaptive questions |
| User journey | 1 | 42 | Full guest→login flow |
| Distributed agents | 1 | 29 | Goal notifications |
| Others | 13 | ~600+ | Search, notifications, roles, etc. |

## Custom Commands

Defined in `cypress/support/e2e.js`:

| Command | Description |
|---------|-------------|
| `cy.socialAuth()` | Register + login, stores JWT |
| `cy.socialRegister()` | Register a new user |
| `cy.socialRequest()` | Authenticated API request |
| `cy.socialVisit()` | Visit a social page with auth |
| `cy.socialAuthWithRole(role)` | Auth with a specific role |
| `cy.socialVisitAsAdmin(path)` | Visit admin page with central role |

## Writing Tests: Key Patterns

### Authentication

Use ONE `cy.socialAuth()` in an outer `before()` per spec file:

```javascript
describe('My feature', () => {
  before(() => {
    cy.socialAuth();
  });

  it('does something', () => {
    cy.socialVisit('/social/feed');
    // ...
  });
});
```

!!! warning "Rate limiter"
    Multiple `before()` blocks with `cy.socialAuth()` will hit the registration rate limiter. The 3rd+ auth call fails silently. Use ONE auth per spec file.

### Force Clicks

Always use `{force: true}` on click/type actions (MUI overlays intercept events):

```javascript
cy.get('button').click({force: true});
cy.get('input').type('text', {force: true});
```

### Assertions

Use `.should()` for retrying assertions, NOT `.then()`:

```javascript
// GOOD - retries until true
cy.contains('Post created', {timeout: 10000}).should('be.visible');

// BAD - fires once, may fail on slow renders
cy.get('body').then(($body) => {
  expect($body.text()).to.include('Post created');
});
```

### Role-Protected Pages

Pages behind `<RoleGuard>` need auth/me stubbing:

```javascript
beforeEach(() => {
  cy.intercept('GET', '**/auth/me', {
    body: { success: true, data: { role: 'flat' } }
  });
  localStorage.setItem('token', 'stub-jwt');
});
```

### Webpack Overlay

Remove the webpack dev server error overlay in tests:

```javascript
beforeEach(() => {
  cy.on('window:before:load', (win) => {
    // Remove webpack overlay
    const observer = new MutationObserver(() => {
      const overlay = win.document.getElementById('webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
    });
    observer.observe(win.document.body, { childList: true });
  });
});
```

## CI Integration

### Quality Gate (`.github/workflows/quality.yml`)

Runs on every push and PR:

```yaml
- npm run lint                    # ESLint
- npm audit --audit-level=high    # Security audit
```

### Test Reports & Coverage (`.github/workflows/docs.yml`)

Runs on every push to `main`:

1. Starts React dev server with Istanbul coverage instrumentation
2. Runs all Cypress specs with Mochawesome reporter
3. Generates NYC code coverage report
4. Deploys everything to GitHub Pages:
    - `/` — MkDocs documentation
    - `/test-reports/` — Mochawesome HTML test report
    - `/coverage/` — Istanbul code coverage report
    - `/reports.html` — Index page linking all three
