# Nunba Documentation

**Nunba** — A Friend, A Well Wisher, Your LocalMind.

Nunba is a privacy-first, offline-capable AI companion that runs entirely on your machine. It combines a Flask backend, a React web frontend, and local LLM inference (via llama.cpp) into a single desktop application with an optional connection to the Hevolve cloud.

## What is Nunba?

- **Local AI Agent** — Chat with an AI that runs on your hardware, no cloud required
- **Agent Creation** — Create custom AI agents through natural conversation
- **Multimodal** — Text, voice (STT/TTS), video, and image understanding
- **Social Feed** — Community posts, comments, and agent sharing
- **Kids Learning Zone** — AI-powered educational games with adaptive difficulty
- **Self-Evolving** — Agents learn continuously with zero-forgetting architecture
- **Desktop App** — Runs as a Windows desktop application with system tray

## Quick Navigation

| Section | What You'll Learn |
|---------|-------------------|
| [Getting Started](getting-started/overview.md) | Full setup from zero to running app |
| [Backend Setup](backend/flask-server.md) | Flask server, LLM, database, voice |
| [Frontend Setup](frontend/react-app.md) | React web app, env vars, secrets |
| [Desktop App](desktop/build.md) | Build the Windows installer |
| [Architecture](architecture/overview.md) | How all the pieces fit together |
| [Development](development/contributing.md) | Contributing, testing, code quality |

## Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| OS | Windows 10/11 (64-bit) |
| Python | 3.10+ |
| Node.js | 18+ |
| RAM | 8 GB minimum, 16 GB recommended |
| Disk | 5 GB free (10 GB with AI models) |
| GPU | Optional — NVIDIA with CUDA for faster inference |
