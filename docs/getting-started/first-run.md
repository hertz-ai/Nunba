# First Run

With dependencies installed and environment configured, you're ready to start Nunba.

## Development Mode (Two Terminals)

### Terminal 1: Start the Flask Backend

```bash
# From project root, with venv activated
python main.py
```

You should see:

```
 * Running on http://127.0.0.1:5000
 * Social API: 195+ routes registered
 * Database initialized at ~/Documents/Nunba/data/hevolve_database.db
```

!!! warning "First run creates the database"
    On first launch, `main.py` calls `init_db()` and `run_migrations()` to create all 51 SQLite tables. This takes a few seconds. Subsequent starts are faster.

### Terminal 2: Start the React Frontend

```bash
cd landing-page
npm start
```

The app opens at [http://localhost:3000](http://localhost:3000).

You should see the Nunba loading screen (Hevolve logo + spinner), then the landing page.

## What Happens on First Start

1. **Backend (`main.py`)**:
    - Creates `~/Documents/Nunba/` directory structure
    - Initializes SQLite database with all tables
    - Runs migrations (adds new columns to existing tables)
    - Starts Flask on port 5000
    - Registers chatbot routes, social API, admin API
    - (If llama.cpp is installed) Starts the LLM server on port 8080

2. **Frontend (`npm start`)**:
    - Compiles React app with hot-reload
    - Reads environment from `.env.local`
    - Proxies API calls to `http://localhost:5000`

3. **Login Flow**:
    - Click "Continue as Guest" on the login screen
    - This creates a local guest account (no email/phone needed)
    - You can chat with the AI immediately (if llama.cpp is running)

## Verify Everything Works

### Check Backend Health

```bash
curl http://localhost:5000/backend/health
```

Expected response:
```json
{"status": "ok", "version": "1.0"}
```

### Check Social API

```bash
curl http://localhost:5000/api/social/feed
```

Expected: JSON response with an empty feed or sample posts.

### Check Chat (requires LLM)

If you haven't set up llama.cpp yet, the chat will show "Connecting to backend..." — this is normal. See [LLM Setup](../backend/llm-setup.md) to configure local AI.

## Common First-Run Issues

### Port 5000 already in use

Another process is using port 5000. Find and stop it:

```bash
# Windows
netstat -ano | findstr ":5000"
taskkill /F /PID <pid>

# macOS (AirPlay Receiver uses 5000)
# Disable AirPlay Receiver in System Settings → General → AirDrop & Handoff
```

### `ModuleNotFoundError: No module named 'integrations'`

The `hart-backend` package is not installed. Either:

- Install it: `pip install hart-backend @ git+https://github.com/hertz-ai/HARTOS.git@main`
- Or run without social features — the backend will print a warning but still start

### Frontend shows blank white page

Check the browser console (F12 → Console) for errors. Common causes:

- `.env.local` not created → copy from `.env.example`
- `REACT_APP_SECRET_KEY` not set → run `node src/pages/generateKey.js`
- Node modules not installed → run `npm install`

### Database locked error

Only one Flask process can access the SQLite database at a time. If you see `database is locked`:

```bash
# Kill all Python processes on port 5000
# Windows:
taskkill /F /IM python.exe
# Then restart:
python main.py
```

## Data Directories

Nunba stores all user data in `~/Documents/Nunba/`:

```
~/Documents/Nunba/
├── data/
│   ├── hevolve_database.db    # Main SQLite database
│   ├── nunba_social.db        # Social features database
│   └── memory_graph/          # Agent memory (FTS5)
├── logs/
│   ├── server.log             # Flask backend logs
│   └── gui_app.log            # Desktop app logs
├── storage/
│   ├── user_data.json         # Local user preferences
│   └── device_id.json         # Device identification
└── uploads/                   # User-uploaded files
```

## Next Steps

- [Set up local LLM](../backend/llm-setup.md) to enable AI chat
- [Set up voice pipeline](../backend/voice-pipeline.md) for speech-to-text
- [Build the desktop app](../desktop/build.md) for distribution
