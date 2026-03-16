# -*- mode: python ; coding: utf-8 -*-
"""
nunba_unified.spec - PyInstaller spec file for Nunba Desktop Application

Bundles:
- Nunba main application (app.py, main.py)
- HARTOS backend (chatbot_routes.py)
- Flask server with SQLAlchemy/SQLite database support
- React landing page (landing-page/build)
- TTS engines (Piper, VibeVoice)
- AI components (llama.cpp integration)

Output: Nunba.exe (Windows) / HevolveDesktop (cross-platform name)
"""

import os
import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_all

# Project root directory
SPEC_ROOT = os.path.dirname(os.path.abspath(SPEC))
PROJECT_ROOT = os.path.dirname(SPEC_ROOT)

# Application metadata
APP_NAME = 'Nunba'
APP_VERSION = '2.0.0'
APP_AUTHOR = 'HevolveAI'

# Paths
MAIN_SCRIPT = os.path.join(PROJECT_ROOT, 'app.py')
ICON_FILE = os.path.join(PROJECT_ROOT, 'app.ico')

# ============================================================================
# HIDDEN IMPORTS
# ============================================================================
# These are imports that PyInstaller cannot detect automatically

hidden_imports = [
    # Flask and web framework
    'flask',
    'flask_cors',
    'werkzeug',
    'werkzeug.serving',
    'werkzeug.debug',
    'jinja2',
    'jinja2.ext',
    'markupsafe',
    'itsdangerous',
    'click',

    # WSGI servers
    'waitress',
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.websockets',

    # FastAPI/Starlette (for async endpoints)
    'fastapi',
    'fastapi.applications',
    'fastapi.routing',
    'starlette',
    'starlette.applications',
    'starlette.routing',
    'starlette.middleware',

    # Database - SQLAlchemy
    'sqlalchemy',
    'sqlalchemy.ext.declarative',
    'sqlalchemy.orm',
    'sqlalchemy.pool',
    'sqlalchemy.dialects.sqlite',
    'sqlalchemy.engine',
    'sqlalchemy.sql',
    'sqlalchemy.sql.default_comparator',

    # Alembic (database migrations)
    'alembic',
    'alembic.config',
    'alembic.script',
    'alembic.runtime',
    'alembic.runtime.migration',

    # Pydantic (data validation)
    'pydantic',
    'pydantic.fields',
    'pydantic.main',
    'pydantic_core',

    # LangChain components
    'langchain',
    'langchain.chains',
    'langchain.llms',
    'langchain.prompts',
    'langchain.schema',
    'langchain.memory',
    'langchain_core',
    'langchain_community',

    # HTTP/Networking
    'requests',
    'urllib3',
    'certifi',
    'charset_normalizer',
    'idna',
    'httpx',
    'httpcore',
    'anyio',
    'sniffio',
    'h11',

    # Async support
    'asyncio',
    'aiohttp',
    'aiosignal',
    'frozenlist',
    'multidict',
    'yarl',
    'async_timeout',

    # Autobahn (WebSocket)
    'autobahn',
    'autobahn.asyncio',
    'autobahn.asyncio.websocket',
    'autobahn.websocket',
    'twisted',

    # GUI and system tray
    'webview',
    'webview.platforms',
    'pystray',
    'PIL',
    'PIL.Image',
    'PIL.ImageDraw',

    # Windows-specific
    'win10toast',
    'pyautogui',
    'pyperclip',
    'ctypes',
    'winreg',

    # .NET integration (for EdgeChromium WebView)
    'pythonnet',
    'clr_loader',
    'cffi',
    'pycparser',

    # Data processing
    'json',
    'uuid',
    'datetime',
    'collections',
    'typing',
    'typing_extensions',

    # Google Auth (for Hevolve_Database OAuth)
    'google',
    'google.oauth2',
    'google.oauth2.id_token',
    'google.auth',
    'google.auth.transport',
    'google.auth.transport.requests',
    'cachetools',
    'rsa',
    'pyasn1',
    'pyasn1_modules',

    # Geospatial (for social/location features)
    'shapely',
    'shapely.geometry',
    'pytz',
    'greenlet',

    # Crash reporting
    'sentry_sdk',
    'sentry_sdk.integrations',
    'sentry_sdk.integrations.flask',
    'sentry_sdk.integrations.logging',

    # Project modules
    'main',
    'chatbot_routes',
    'indicator_window',
    'llama_installer',
    'llama_config',
    'llama_health_endpoint',
    'tray_handler',
    'platform_utils',
    'piper_tts',
    'vibevoice_tts',
    'tts_engine',
    'ai_installer',
    'crash_reporter',
    'config',

    # Hevolve Database modules (pip package: hevolve-database, import as sql.*)
    'sql',
    'sql.database',
    'sql.models',
    'sql.crud',
    'sql.schemas',
    'sql.otp',
    'sql.bookparsing',
    # Legacy submodule paths (fallback for frozen builds using embedded copy)
    'Hevolve_Database.sql.database',
    'Hevolve_Database.sql.models',
    'Hevolve_Database.sql.crud',
    'Hevolve_Database.sql.schemas',
    'Hevolve_Database.sql.otp',
    'Hevolve_Database.sql.bookparsing',
    'Hevolve_Database.supportive.queries',
    'Hevolve_Database.supportive.standard',

    # Agent Ledger (distributed task coordination)
    'agent_ledger',
    'agent_ledger.core',
    'agent_ledger.backends',
    'agent_ledger.factory',
    'agent_ledger.graph',
    'agent_ledger.distributed',
    'agent_ledger.heartbeat',
    'agent_ledger.pubsub',
    'agent_ledger.verification',

    # Standard library modules that may be missed
    'logging',
    'logging.handlers',
    'threading',
    'subprocess',
    'shlex',
    'shutil',
    'pathlib',
    'platform',
    'socket',
    'io',
    'base64',
    'hashlib',
    'hmac',
    'secrets',
    'traceback',
    'importlib',
    'importlib.util',
    'importlib.metadata',
    'zipfile',
    'tarfile',
    'gzip',
    'urllib.request',
    'urllib.error',
    'urllib.parse',
    'email',
    'email.mime',
    'email.mime.text',
    'email.mime.multipart',
    'ssl',
    'sqlite3',
    'tkinter',
    'tkinter.messagebox',
    'tkinter.filedialog',

    # Encodings
    'encodings',
    'encodings.utf_8',
    'encodings.ascii',
    'encodings.latin_1',
    'encodings.cp1252',
]

# Collect additional submodules dynamically
try:
    hidden_imports.extend(collect_submodules('flask'))
    hidden_imports.extend(collect_submodules('sqlalchemy'))
    hidden_imports.extend(collect_submodules('werkzeug'))
    hidden_imports.extend(collect_submodules('jinja2'))
except Exception as e:
    print(f"Warning: Could not collect some submodules: {e}")

# ============================================================================
# DATA FILES
# ============================================================================
# Non-Python files that need to be included

datas = []

# Configuration files
config_files = [
    ('config.json', '.'),
    ('template.json', '.'),
]
for src, dst in config_files:
    src_path = os.path.join(PROJECT_ROOT, src)
    if os.path.exists(src_path):
        datas.append((src_path, dst))

# Python source files (needed for dynamic imports)
python_sources = [
    'main.py',
    'chatbot_routes.py',
    'indicator_window.py',
    'llama_installer.py',
    'llama_config.py',
    'llama_health_endpoint.py',
    'tray_handler.py',
    'platform_utils.py',
    'piper_tts.py',
    'vibevoice_tts.py',
    'tts_engine.py',
    'ai_installer.py',
    'crash_reporter.py',
    'config.py',
    'setup.py',
]
for src in python_sources:
    src_path = os.path.join(PROJECT_ROOT, src)
    if os.path.exists(src_path):
        datas.append((src_path, '.'))

# Templates folder
templates_dir = os.path.join(PROJECT_ROOT, 'templates')
if os.path.exists(templates_dir):
    datas.append((templates_dir, 'templates'))

# Static folder (legacy)
static_dir = os.path.join(PROJECT_ROOT, 'static')
if os.path.exists(static_dir):
    datas.append((static_dir, 'static'))

# React landing page build
landing_page_build = os.path.join(PROJECT_ROOT, 'landing-page', 'build')
if os.path.exists(landing_page_build):
    datas.append((landing_page_build, 'landing-page/build'))
else:
    print(f"WARNING: Landing page build not found at {landing_page_build}")
    print("         Run 'npm run build' in landing-page folder first!")

# Hevolve Database folder (includes SQLite DB and alembic migrations)
hevolve_db_dir = os.path.join(PROJECT_ROOT, 'Hevolve_Database')
if os.path.exists(hevolve_db_dir):
    datas.append((hevolve_db_dir, 'Hevolve_Database'))

# Integrations folder (social features)
integrations_dir = os.path.join(PROJECT_ROOT, 'integrations')
if os.path.exists(integrations_dir):
    datas.append((integrations_dir, 'integrations'))

# Agent Ledger package (distributed task coordination)
# Located in the HARTOS project
agent_ledger_dir = os.path.join(
    os.path.dirname(PROJECT_ROOT),
    'HARTOS', 'agent-ledger-opensource', 'agent_ledger')
if os.path.exists(agent_ledger_dir):
    datas.append((agent_ledger_dir, 'agent_ledger'))
    print(f"Including agent_ledger from: {agent_ledger_dir}")
else:
    print(f"WARNING: agent_ledger not found at {agent_ledger_dir}")

# Image assets
asset_files = [
    ('cursor.png', '.'),
    ('app.ico', '.'),
    ('Product_Hevolve_Logo.png', '.'),
]
for src, dst in asset_files:
    src_path = os.path.join(PROJECT_ROOT, src)
    if os.path.exists(src_path):
        datas.append((src_path, dst))

# Manifest files
manifest_files = [
    ('app.manifest', '.'),
    ('nunba.manifest', '.'),
]
for src, dst in manifest_files:
    src_path = os.path.join(PROJECT_ROOT, src)
    if os.path.exists(src_path):
        datas.append((src_path, dst))

# Embedded Python (for subprocess execution)
python_embed_dir = os.path.join(PROJECT_ROOT, 'python-embed')
if os.path.exists(python_embed_dir):
    datas.append((python_embed_dir, 'python-embed'))

# pycparser source files (fix for circular import in frozen apps)
try:
    import pycparser
    pycparser_dir = os.path.dirname(pycparser.__file__)
    if os.path.exists(pycparser_dir):
        datas.append((pycparser_dir, 'lib_src/pycparser'))
        print(f"Including pycparser from: {pycparser_dir}")
except ImportError:
    print("Warning: pycparser not found, .NET integration may not work")

# Certifi CA bundle
try:
    import certifi
    datas.append((certifi.where(), 'certifi'))
except ImportError:
    print("Warning: certifi not found")

# Collect data files for packages that need them
try:
    # Pydantic
    datas.extend(collect_data_files('pydantic'))
except Exception:
    pass

try:
    # PIL/Pillow
    datas.extend(collect_data_files('PIL'))
except Exception:
    pass

try:
    # Piper TTS
    datas.extend(collect_data_files('piper'))
except Exception:
    pass

# ============================================================================
# BINARY FILES
# ============================================================================
# DLLs and shared libraries

binaries = []

# Find and include zlib.dll (Windows)
if sys.platform == 'win32':
    python_dir = os.path.dirname(sys.executable)
    zlib_locations = [
        os.path.join(python_dir, 'zlib.dll'),
        os.path.join(python_dir, 'DLLs', 'zlib.dll'),
        os.path.join(python_dir, 'Library', 'bin', 'zlib.dll'),
    ]
    for zlib_path in zlib_locations:
        if os.path.exists(zlib_path):
            binaries.append((zlib_path, '.'))
            print(f"Including zlib.dll from: {zlib_path}")
            break

# ============================================================================
# EXCLUDES
# ============================================================================
# Packages to exclude to reduce bundle size

excludes = [
    # Test frameworks and test modules
    'unittest', 'test', 'tests', 'pytest', '_pytest',
    'asyncio.test', 'ctypes.test', 'tkinter.test', 'sqlite3.test',

    # Heavy ML frameworks (not needed - using llama.cpp)
    'torch', 'tensorflow', 'keras', 'transformers',
    'numpy.tests', 'scipy', 'pandas.tests',

    # Development tools
    'IPython', 'jupyter', 'notebook',
    'setuptools', 'distutils', 'pip',
    'lib2to3', 'pydoc_data',

    # Alternative GUI frameworks (using EdgeChromium/WebView2)
    'PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'qtpy',
    'webview.platforms.qt',

    # Shapely extras
    'shapely.plotting', 'shapely.tests',

    # Matplotlib (not needed)
    'matplotlib', 'matplotlib.tests',
]

# ============================================================================
# ANALYSIS
# ============================================================================

block_cipher = None

# hart-backend (HARTOS) is pip-installed in editable mode.
# Adding its root to pathex lets PyInstaller resolve all loose .py modules
# (hart_intelligence, hart_intelligence, cultural_wisdom, create_recipe, reuse_recipe, etc.)
# without needing to list each one in py-modules or hiddenimports.
HARTOS_BACKEND_ROOT = os.path.join(os.path.dirname(PROJECT_ROOT), 'HARTOS')
if not os.path.exists(HARTOS_BACKEND_ROOT):
    print(f"WARNING: hart-backend repo not found at {HARTOS_BACKEND_ROOT}")

a = Analysis(
    [MAIN_SCRIPT],
    pathex=[PROJECT_ROOT, HARTOS_BACKEND_ROOT],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# ============================================================================
# PYZ (Python Archive)
# ============================================================================

pyz = PYZ(
    a.pure,
    a.zipped_data,
    cipher=block_cipher
)

# ============================================================================
# EXE
# ============================================================================

exe = EXE(
    pyz,
    a.scripts,
    [],  # Don't include binaries in EXE for onedir mode
    exclude_binaries=True,  # Onedir mode
    name=APP_NAME,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # GUI application (no console window)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=ICON_FILE if os.path.exists(ICON_FILE) else None,
    version=None,  # Can add version info file here
    uac_admin=False,  # Don't require admin by default
    uac_uiaccess=False,
)

# ============================================================================
# COLLECT (onedir bundle)
# ============================================================================

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name=APP_NAME,
)

# ============================================================================
# BUNDLE (macOS .app bundle)
# ============================================================================

# Uncomment for macOS builds:
# app = BUNDLE(
#     coll,
#     name='Nunba.app',
#     icon='app.icns',
#     bundle_identifier='com.hevolveai.nunba',
#     info_plist={
#         'NSHighResolutionCapable': 'True',
#         'CFBundleShortVersionString': APP_VERSION,
#         'CFBundleVersion': APP_VERSION,
#         'NSPrincipalClass': 'NSApplication',
#         'NSAppleScriptEnabled': False,
#     },
# )

# ============================================================================
# BUILD INSTRUCTIONS
# ============================================================================
"""
To build the application:

1. Install PyInstaller:
   pip install pyinstaller

2. Build the React landing page (if not already built):
   cd landing-page
   npm install
   npm run build
   cd ..

3. Run PyInstaller with this spec file:
   pyinstaller nunba_unified.spec --clean

4. The output will be in:
   dist/Nunba/Nunba.exe  (Windows)
   dist/Nunba/Nunba      (Linux/macOS)

5. For a single-file executable (larger but simpler distribution):
   Change exclude_binaries=True to exclude_binaries=False
   and remove the COLLECT section

Alternative build commands:

   # Debug build (with console):
   pyinstaller nunba_unified.spec --clean --debug all

   # Onefile build:
   pyinstaller nunba_unified.spec --clean --onefile

   # With UPX compression (smaller size):
   pyinstaller nunba_unified.spec --clean --upx-dir /path/to/upx

Notes:
- Ensure all Python dependencies are installed in the build environment
- The React build (landing-page/build) must exist before building
- On Windows, ensure Visual C++ Redistributable is installed
- For .NET/WebView2 support, ensure .NET Framework 4.7.2+ is available
"""
