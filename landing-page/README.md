# Hevolve AI — Landing Page & Web App

Self-evolving multimodal AI agents through natural conversation. This is the React web frontend for the Hevolve AI / Nunba platform.

## Features

- **AI Agent Chat** — Conversational interface with voice (TTS/STT), video, and text
- **Agent Creation** — Create custom AI agents through natural language, no coding required
- **Social Feed** — Community posts, comments, likes, and agent sharing
- **Kids Learning Zone** — AI-powered educational games with adaptive difficulty
- **Admin Panel** — User management, moderation, channel configuration
- **Offline-First** — Works with local Nunba Flask backend; falls back to cloud when available
- **Browser TTS** — Zero-latency text-to-speech via Pocket TTS (ONNX, English)
- **Voice Pipeline** — Whisper STT, speaker diarization, real-time transcription

## Prerequisites

- **Node.js** >= 18
- **npm** or **yarn**
- **Nunba Flask backend** running on `http://localhost:5000` (see [backend repo](https://github.com/anthropics/nunba-backend))

## Quick Start

```bash
# Clone the repo
git clone https://github.com/anthropics/nunba.git
cd nunba/landing-page

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local — at minimum set REACT_APP_SECRET_KEY

# Start development server
npm start
```

The app will be available at `http://localhost:3000`.

## Environment Configuration

Copy `.env.example` to `.env.local` and configure:

| Variable                      | Default                         | Description                                                    |
| ----------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `REACT_APP_API_BASE_URL`      | `http://localhost:5000`         | Local Flask backend URL                                        |
| `REACT_APP_SECRET_KEY`        | (required)                      | Encryption key — generate with `node src/pages/generateKey.js` |
| `REACT_APP_CLOUD_API_URL`     | `https://azurekong.hertzai.com` | Hevolve cloud API (optional)                                   |
| `REACT_APP_SENTRY_DSN`        | (empty)                         | Sentry error tracking DSN (optional)                           |
| `REACT_APP_GA_MEASUREMENT_ID` | (empty)                         | Google Analytics ID (optional)                                 |

See `.env.example` for the full list.

## Architecture

```
React SPA (port 3000)
  |
  +-- Nunba Flask Backend (port 5000)
  |     +-- SQLite (social, agents, memory)
  |     +-- hart_intelligence (port 6778) --> llama.cpp (port 8080)
  |     +-- Whisper STT, Piper TTS
  |
  +-- Hevolve Cloud (optional, online features)
        +-- Azure GPT, media processing, OTP auth
```

## Testing

End-to-end tests use [Cypress](https://www.cypress.io/):

```bash
# Run Cypress interactively
npx cypress open

# Run headless
npx cypress run
```

The test suite has 29 spec files covering auth flows, social features, agent creation, voice pipeline, admin panel, and more.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting pull requests.

## License

[MIT](LICENSE.md)
