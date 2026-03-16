# Clone & Install

## Step 1: Clone the Repository

```bash
git clone https://github.com/hertz-ai/nunba.git
cd nunba
```

## Step 2: Create a Python Virtual Environment

!!! warning "Always use a virtual environment"
    Installing dependencies globally can conflict with other Python projects. A virtual environment keeps Nunba's dependencies isolated.

```bash
python -m venv .venv
```

Activate it:

=== "Windows (Command Prompt)"

    ```bash
    .venv\Scripts\activate
    ```

=== "Windows (Git Bash)"

    ```bash
    source .venv/Scripts/activate
    ```

=== "Windows (PowerShell)"

    ```powershell
    .venv\Scripts\Activate.ps1
    ```

    If you get an execution policy error:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    .venv\Scripts\Activate.ps1
    ```

=== "macOS / Linux"

    ```bash
    source .venv/bin/activate
    ```

Your terminal prompt should now show `(.venv)`.

## Step 3: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs:

| Package | Purpose |
|---------|---------|
| `flask`, `flask-cors` | Backend web server |
| `pywebview` | Desktop app window (WebView2) |
| `sqlalchemy`, `alembic` | Database ORM and migrations |
| `sentry-sdk` | Error reporting (optional) |
| `hart-backend` | Hevolve social/admin backend |
| `requests` | HTTP client |
| `pyautogui`, `pillow` | Screen capture for visual AI |
| `python-dotenv` | Environment variable loading |

!!! note "hart-backend"
    The `hart-backend` package is installed from the Hevolve GitHub repository. If you don't have access to the private repo, you can skip this package — the app will run without social features.

    To install without hart-backend:
    ```bash
    pip install flask flask-cors pywebview sqlalchemy pillow requests python-dotenv
    ```

### Optional: Voice Pipeline Dependencies

For speech-to-text (Whisper) and text-to-speech (Piper):

```bash
pip install openai-whisper piper-tts pyaudio
```

For speaker diarization (requires a HuggingFace token):

```bash
pip install whisperx pyannote.audio
```

## Step 4: Install Node.js Dependencies (Frontend)

```bash
cd landing-page
npm install
```

This installs ~80 packages including React 18, MUI, Cypress, Tailwind CSS, and more.

The install takes 2-5 minutes depending on your network speed.

```bash
# Verify installation
npm ls react   # Should show react@18.x.x
```

## Step 5: Verify Installation

Run these checks to confirm everything is installed:

```bash
# From project root
python -c "import flask; print('Flask', flask.__version__)"
python -c "import sqlalchemy; print('SQLAlchemy', sqlalchemy.__version__)"

# From landing-page directory
cd landing-page
npx react-scripts --version   # Should print 5.0.1
```

## Directory Structure After Installation

```
nunba/
├── .venv/                  # Python virtual environment
├── main.py                 # Flask backend entry point
├── app.py                  # Desktop app entry point (PyWebView)
├── chatbot_routes.py       # Chat API routes
├── llama_installer.py      # Auto llama.cpp installer
├── llama_config.py         # LLM configuration
├── requirements.txt        # Python dependencies
├── .env.example            # Backend env template
├── docs/GUARDRAILS.md      # Core philosophy
├── landing-page/
│   ├── node_modules/       # Node dependencies (auto-created)
│   ├── src/                # React source code
│   ├── public/             # Static assets
│   ├── package.json        # Node dependencies + scripts
│   ├── .env.example        # Frontend env template
│   └── scripts/            # Build helper scripts
├── Hevolve_Database/       # Database schemas
├── agent_data/             # Default agent configurations
└── docs/                   # This documentation
```

## Next Step

Proceed to [Environment Configuration](environment.md) to set up your `.env` files.
