# Overview

This guide walks you through a complete Nunba setup from source. By the end, you will have:

1. The **Flask backend** serving the API on port 5000
2. The **React frontend** running on port 3000 (dev) or bundled into the backend
3. A **local LLM** running via llama.cpp on port 8080
4. (Optional) The **LangChain agent service** on port 6778
5. (Optional) The **desktop app** built as a Windows executable with system tray

## Two Ways to Run Nunba

### Option A: Development Mode (recommended for contributors)

Run the backend and frontend as separate processes. Hot-reload on code changes.

```
Terminal 1:  python main.py          → Flask on :5000
Terminal 2:  cd landing-page && npm start  → React on :3000
Terminal 3:  (optional) llama-server       → llama.cpp on :8080
```

### Option B: Desktop App (end-user distribution)

Build the React app, then package everything into a single Windows executable.

```
cd landing-page && npm run build    → static files in build/
cd .. && python setup_freeze.py build  → executable in build/
```

## Setup Flow

```
1. Install Prerequisites (Python, Node.js, Git)
       ↓
2. Clone Repository
       ↓
3. Install Python Dependencies (pip install -r requirements.txt)
       ↓
4. Install Node Dependencies (cd landing-page && npm install)
       ↓
5. Configure Environment (.env files)
       ↓
6. Start Backend (python main.py)
       ↓
7. Start Frontend (npm start)
       ↓
8. (Optional) Set Up Local LLM (llama.cpp)
       ↓
9. (Optional) Build Desktop App (cx_Freeze)
```

Each step is detailed in the following pages.
