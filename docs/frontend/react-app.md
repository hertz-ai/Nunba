# React Web App

The Nunba frontend is a React 18 single-page application built with Create React App (CRA) and Tailwind CSS.

## Development Server

```bash
cd landing-page
npm start
```

Opens at [http://localhost:3000](http://localhost:3000) with hot-reload.

## Project Structure

```
landing-page/
├── public/
│   ├── index.html              # HTML template with SEO meta tags
│   ├── HevolveLogo.png         # App logo
│   └── site.webmanifest        # PWA manifest
├── src/
│   ├── App.js                  # Root component, routing, providers
│   ├── config/
│   │   └── apiBase.js          # Centralized API base URLs
│   ├── components/
│   │   ├── config.js           # App configuration (env var driven)
│   │   ├── Social/             # Social feed components
│   │   │   └── KidsLearning/   # Kids learning zone
│   │   ├── signIn.js           # Student sign-in
│   │   ├── TeacherSignIn.js    # Teacher sign-in
│   │   └── shared/             # Reusable components
│   ├── hooks/
│   │   ├── useCrashReporter.js # Sentry integration
│   │   └── useTTS.js           # Text-to-speech hook
│   ├── pages/
│   │   ├── login.js            # Login page
│   │   ├── OtpAuthModal.js     # OTP authentication modal
│   │   └── blogs/              # Blog content
│   ├── services/
│   │   ├── axiosFactory.js     # Centralized axios instance factory
│   │   └── socialApi.js        # Social API client
│   └── utils/
│       ├── encryption.js       # AES encryption utilities
│       └── polling.js          # Async polling utility
├── cypress/                    # E2E tests
├── package.json
├── tailwind.config.js
├── config-overrides.js         # Webpack overrides (react-app-rewired)
├── .env.example                # Environment template
└── scripts/
    ├── setup-env.sh            # Auto-decrypts production secrets
    └── encrypt-env.sh          # Encrypts .env.production
```

## Key Libraries

| Library | Purpose |
|---------|---------|
| React 18 | UI framework |
| react-router-dom v6 | Client-side routing (BrowserRouter) |
| MUI v5 | Material Design components |
| Tailwind CSS v3 | Utility-first CSS |
| axios | HTTP client |
| crypto-js | Client-side encryption |
| DOMPurify | XSS protection |
| Cypress 15 | E2E testing |
| react-ga | Google Analytics |
| Sentry SDK | Error tracking |

## Routing

The app uses `BrowserRouter` (not HashRouter). Key routes:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Landing page | Marketing / info page |
| `/social` | Social feed | Community posts |
| `/social/post/:id` | Post detail | Individual post |
| `/social/search` | Search | Search posts/users |
| `/social/notifications` | Notifications | User notifications |
| `/admin/*` | Admin panel | Moderation, settings |

## Build for Production

```bash
cd landing-page
npm run build
```

This creates an optimized build in `landing-page/build/` that the Flask backend serves as static files.

### What happens during build:

1. `prebuild` hook runs `scripts/setup-env.sh`:
    - If `NUNBA_ENV_KEY` is set → decrypts `.env.production.enc` → `.env.production`
    - If `.env.local` exists → uses that
    - Otherwise → copies `.env.example` → `.env.local`
2. CRA bundles all `REACT_APP_*` variables into the JavaScript
3. Output goes to `build/` directory

## Bundle Analysis

```bash
npm run build
npm run analyze
```

Opens a treemap showing bundle size breakdown.
