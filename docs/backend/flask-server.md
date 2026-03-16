# Flask Server

The Nunba backend is a Flask application (`main.py`) that serves the API, manages the database, and coordinates with local AI services.

## Starting the Server

```bash
# Activate virtual environment
source .venv/Scripts/activate   # Windows Git Bash
# or: .venv\Scripts\activate    # Windows CMD

python main.py
```

Default port: **5000**

## Server Architecture

```
main.py (Flask App)
├── /chat, /teachme2             → chatbot_routes.py (AI chat)
├── /api/social/*                → hart-backend social_bp (195+ routes)
│   ├── /auth/*                  → Registration, login, JWT
│   ├── /feed, /posts/*          → Social feed CRUD
│   ├── /users/*                 → User profiles
│   └── /admin/*                 → Moderation, stats
├── /api/admin/*                 → hart-backend admin_bp (channels, config)
├── /api/distributed/*           → Distributed agent coordination
├── /api/media/*                 → Media asset serving
├── /voice/*                     → STT/TTS endpoints
├── /backend/health              → Health check
├── /agents/sync, /agents/migrate → Multi-device agent sync
└── /screenshot, /click, /indicator → Desktop automation
```

## Key Configuration

The server reads configuration from environment variables and hardcoded defaults:

```python
# Data directory
PROGRAM_DATA_DIR = ~/Documents/Nunba/

# Database
HEVOLVE_DB_PATH = ~/Documents/Nunba/data/hevolve_database.db

# LangChain service (optional)
HARTOS_BACKEND_URL = http://localhost:6777
```

## Running in Production

For production deployment, use Waitress instead of Flask's dev server:

```bash
pip install waitress
waitress-serve --host=0.0.0.0 --port=5000 main:app
```

## API Authentication

The social API uses JWT tokens:

1. **Register**: `POST /api/social/auth/register` → returns `api_token`
2. **Login**: `POST /api/social/auth/login` → returns JWT in `data.token`
3. **All subsequent requests**: `Authorization: Bearer <JWT>`

The frontend handles this automatically via the auth flow in `OtpAuthModal.js`.

## Database Initialization

On startup, `main.py`:

1. Creates the data directory (`~/Documents/Nunba/data/`)
2. Calls `init_db()` to create all SQLAlchemy tables
3. Calls `run_migrations()` to add new columns (16 migration versions)

!!! warning "SQLAlchemy `create_all()` does NOT add columns"
    If you add a new column to a model, you must create a migration. `create_all()` only creates missing tables — it never alters existing ones.

## Rate Limiting

In development mode (`sys.frozen` is False), the social API rate limiter is disabled:

```python
os.environ.setdefault('SOCIAL_RATE_LIMIT_DISABLED', '1')
```

In production (frozen exe), rate limiting is active. To disable it for testing:

```bash
set SOCIAL_RATE_LIMIT_DISABLED=1
python main.py
```
