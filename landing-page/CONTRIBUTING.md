# Contributing to Hevolve AI

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your change: `git checkout -b feat/my-feature`
4. **Install dependencies**: `npm install`
5. **Set up environment**: `cp .env.example .env.local` and configure
6. **Make your changes**
7. **Run the build**: `npm run build` to verify it compiles
8. **Run tests**: `npx cypress run` for E2E tests
9. **Submit a Pull Request**

## Pull Request Format

Format your PR title as:

> [Tag]: Describe change in present tense

Tags:

- **Feat** — new feature
- **Fix** — bug fix
- **Refactor** — code restructuring (no behavior change)
- **Style** — formatting, no code change
- **Doc** — documentation changes
- **Test** — adding or updating tests

Example: `[Feat]: Add voice language selection to chat settings`

## Code Style

- **ESLint** with security plugin — run `npm run lint` before submitting
- **Prettier** for formatting — config in `.prettierrc`
- **Tailwind CSS** for styling — follow existing utility-class patterns
- **React hooks** — prefer functional components with hooks

## What We Look For

- Changes should be focused and minimal — one PR per concern
- New features should include Cypress E2E tests where applicable
- No hardcoded secrets, API keys, or personal data in source code
- Environment-specific values go in `.env.example` with `REACT_APP_*` prefix

## Reporting Issues

- Use GitHub Issues to report bugs or request features
- Include steps to reproduce, expected vs actual behavior, and browser/OS info

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE.md).
