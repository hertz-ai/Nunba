@echo off
REM ============================================================
REM  Nunba Desktop App - Build Script (Windows)
REM  Delegates to build.py for all build logic.
REM ============================================================
REM  Usage:
REM    build.bat                      - Full build (exe + installer)
REM    build.bat app                  - Build executable only
REM    build.bat installer            - Build installer only (requires existing build)
REM    build.bat clean                - Clean build artifacts
REM    build.bat --skip-deps          - Skip dependency installation
REM    build.bat --skip-acceptance    - Skip the --acceptance-test gate after freeze.
REM                                     (equivalent: NUNBA_SKIP_ACCEPTANCE=1)
REM                                     Live tee log: ~/Documents/Nunba/logs/build_acceptance.log
REM    build.bat --strict-acceptance  - Restore build-breaker mode (fail/timeout blocks
REM                                     installer packaging). Default is non-strict:
REM                                     failure prints a WARN and continues.
REM                                     (equivalent: NUNBA_STRICT_ACCEPTANCE=1)
REM
REM  Args are pass-through: all flags above (and any future ones) go straight to
REM  scripts\build.py via ARGS=%*.
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
