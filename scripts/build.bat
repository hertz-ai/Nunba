@echo off
REM ============================================================
REM  Nunba Desktop App - Build Script (Windows)
REM  Delegates to build.py for all build logic.
REM ============================================================
REM  Usage:
REM    build.bat              - Full build (exe + installer)
REM    build.bat app          - Build executable only
REM    build.bat installer    - Build installer only (requires existing build)
REM    build.bat clean        - Clean build artifacts
REM    build.bat --skip-deps  - Skip dependency installation
REM ============================================================

setlocal
cd /d "%~dp0.."

REM ---- Find Python ----
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

REM ---- Map legacy arg names ----
set "ARGS=%*"
if /i "%~1"=="exe" set "ARGS=app"

REM ---- Delegate to build.py (unbuffered so logs appear in real time) ----
set "PYTHONUNBUFFERED=1"
"%PYTHON_EXE%" -u scripts\build.py %ARGS%
exit /b %ERRORLEVEL%
