# System Architecture

Nunba is a multi-process application with a Flask backend, React frontend, and optional AI services.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Desktop App (app.py)                     │
│  ┌──────────────────┐  ┌────────────────────────────────────┐  │
│  │   System Tray    │  │         PyWebView Window           │  │
│  │   (pystray)      │  │  ┌────────────────────────────┐   │  │
│  └──────────────────┘  │  │    React SPA (port 3000)   │   │  │
│                        │  │    or static build/        │   │  │
│                        │  └────────────┬───────────────┘   │  │
│                        └───────────────┼───────────────────┘  │
└────────────────────────────────────────┼──────────────────────┘
                                         │ HTTP API calls
                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Flask Backend (main.py)                     │
│                         Port 5000                               │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Chat API   │  │  Social API  │  │     Admin API         │ │
│  │ /chat       │  │ /api/social  │  │ /api/admin            │ │
│  │ /teachme2   │  │ 195+ routes  │  │ 100+ routes           │ │
│  └──────┬──────┘  └──────────────┘  └───────────────────────┘ │
│         │                                                       │
│  ┌──────┴──────────────────────────────────────────────────┐   │
│  │                   SQLite Databases                       │   │
│  │  hevolve_database.db │ nunba_social.db │ memory_graph/  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌─────────┐ ┌─────────────────┐
│ LangChain    │ │llama.cpp│ │  Hevolve Cloud  │
│ Agent Service│ │ Server  │ │  (optional)     │
│ Port 6778    │ │Port 8080│ │  azurekong.*    │
└──────────────┘ └─────────┘ └─────────────────┘
```

## Process Map

| Process | Port | Purpose |
|---------|------|---------|
| `app.py` | — | Desktop window + system tray (PyWebView) |
| `main.py` | 5000 | Flask API server (auto-started by app.py) |
| `llama-server` | 8080 | Local LLM inference (llama.cpp) |
| `hart_intelligence` | 6778 | LangChain agent with tools and memory |
| Diarization sidecar | 8004 | Speaker diarization (WebSocket) |
| React dev server | 3000 | Development only (not used in production) |

## Data Flow: Chat Message

```
1. User types message in React
2. React → POST /chat (Flask :5000)
3. chatbot_routes.py:
   a. Intent detection (Tier 1: deterministic rules)
   b. Route to LangChain agent (Tier 2: :6778)
   c. LangChain → llama.cpp (Tier 3: :8080) with tools
   d. Fallback: direct llama.cpp if LangChain unavailable
4. Response → React → displayed in chat
```

## Data Flow: Social Post

```
1. User creates post in React
2. React → POST /api/social/posts (Flask :5000)
3. SQLAlchemy → INSERT into nunba_social.db
4. NotificationService → SSE broadcast to followers
5. Response → React → post appears in feed
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | PyWebView (WebView2 on Windows) |
| Frontend | React 18, MUI v5, Tailwind CSS 3 |
| Backend | Flask 2.x, SQLAlchemy 2.x |
| Database | SQLite (no external DB required) |
| Local LLM | llama.cpp (GGUF models) |
| Agent Framework | LangChain + AutoGen |
| TTS | PocketTTS (browser), Piper (server) |
| STT | Whisper, Web Speech API |
| Build | cx_Freeze (desktop), CRA (frontend) |
| Testing | Cypress 15 (E2E) |
