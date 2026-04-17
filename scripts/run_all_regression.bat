@echo off
REM run_all_regression.bat — Windows equivalent of run_all_regression.sh.
REM
REM Each tier is passed as TWO strings: label + command-line. The
REM command-line is executed via `cmd /c` so multi-token commands
REM like "python -m ruff check ." work without the `%*`-after-shift
REM trap (which had `%*` expand to include arg 1 even after `shift`,
REM causing the label itself to be executed as a command).

setlocal enabledelayedexpansion
cd /d "%~dp0.."

if "%PYTHON%"=="" set PYTHON=python
set FAIL_COUNT=0
set FAIL_LIST=

REM Belt-and-suspenders: ensure pytest-timeout is present so every
REM test has a wall-clock deadline (hangs -> failures, not silence).
%PYTHON% -m pip install --quiet pytest-timeout 2>nul

call :run_tier "ruff check"  "%PYTHON% -m ruff check ."
call :run_tier "ruff format" "%PYTHON% -m ruff format --check ."

call :run_tier "pytest main" "%PYTHON% -m pytest tests/ --ignore=tests/harness -v --tb=short"
call :run_tier "pytest harness (unit+integration)" "%PYTHON% -m pytest tests/harness -m \"unit or integration\" -v --tb=short --rootdir tests/harness"

if "%NUNBA_LIVE%"=="1" (
    call :run_tier "pytest harness (live)" "%PYTHON% -m pytest tests/harness -m live -v --tb=short --rootdir tests/harness"
)

if "%NUNBA_CYPRESS%"=="1" (
    if exist landing-page (
        pushd landing-page
        call :run_tier "cypress e2e" "npx cypress run --browser chrome"
        popd
    )
)

if "%NUNBA_STAGING%"=="1" (
    if exist scripts\staging_e2e_probe.sh (
        call :run_tier "staging probes" "bash scripts\staging_e2e_probe.sh"
    )
)

echo.
echo ============================================================
if !FAIL_COUNT!==0 (
    echo   ALL TIERS PASSED
    exit /b 0
) else (
    echo   FAILED TIERS: !FAIL_COUNT!
    echo   !FAIL_LIST!
    exit /b 1
)

:run_tier
REM %~1 = tier label, %~2 = command-line (one quoted string)
echo.
echo ============================================================
echo   %~1
echo ============================================================
cmd /c %~2
if errorlevel 1 (
    set /a FAIL_COUNT+=1
    set FAIL_LIST=!FAIL_LIST! "%~1"
)
exit /b 0
