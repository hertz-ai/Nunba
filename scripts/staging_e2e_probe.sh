#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# staging_e2e_probe.sh -- live HTTP probes against docker-compose.staging.yml
# ---------------------------------------------------------------------------
# Hits every endpoint added in recent session commits and asserts the
# expected status + (where cheap) a required JSON field. Exits non-zero on
# ANY regression so GHA marks the job red. No silent pass-throughs.
#
# Invoked by .github/workflows/e2e-staging.yml after `docker compose up -d`
# reports all services healthy. Also safe to run locally against a dev stack.
# ---------------------------------------------------------------------------
set -euo pipefail

BASE="${NUNBA_BASE:-http://localhost:5000}"

# MCP bearer resolution, in the SAME order the server uses
# (HARTOS integrations/mcp/mcp_http_bridge.py:71-72):
#   1. $NUNBA_MCP_BEARER          — CI / docker-compose injects this
#   2. the on-disk token file     — %LOCALAPPDATA%/Nunba/mcp.token (Windows)
#                                   ~/.nunba/mcp.token             (Unix)
#   3. a placeholder that will correctly 403
#
# WHY (2) EXISTS: without it this suite's verdict depended on invisible shell
# state.  Runs from a shell that happened to export NUNBA_MCP_BEARER scored
# 15/15; the identical suite, same machine, same app process, same commit,
# scored 14/15 from a shell that did not — and the failure text ("got 403
# want 200") reads like an app regression when the app was behaving
# perfectly, correctly rejecting a placeholder token.  That is the #619
# shape: a check whose result is decided by shell provenance rather than by
# the thing under test.  Reading the file the server itself names makes the
# probe self-sufficient and the result reproducible.
_mcp_token_path() {
    if [[ -n "${LOCALAPPDATA:-}" ]]; then
        printf '%s/Nunba/mcp.token' "$LOCALAPPDATA"
    else
        printf '%s/.nunba/mcp.token' "$HOME"
    fi
}
if [[ -n "${NUNBA_MCP_BEARER:-}" ]]; then
    TOKEN="$NUNBA_MCP_BEARER"
    TOKEN_SRC='env NUNBA_MCP_BEARER'
else
    _tok_file="$(_mcp_token_path)"
    if [[ -r "$_tok_file" ]]; then
        # strip trailing newline/CR — the file is written without one, but a
        # stray CRLF on Windows would silently corrupt the Authorization header
        TOKEN="$(tr -d '\r\n' < "$_tok_file")"
        TOKEN_SRC="file $_tok_file"
    else
        TOKEN='staging-e2e-token-do-not-use-in-prod'
        TOKEN_SRC="placeholder (no env var, and $_tok_file unreadable)"
    fi
fi
FAIL=0

log()  { printf '\033[36m[probe]\033[0m %s\n' "$*"; }
pass() { printf '\033[32m  OK\033[0m    %s\n' "$*"; PASSED=$((PASSED+1)); }
fail() { printf '\033[31m  FAIL\033[0m  %s\n' "$*"; FAIL=$((FAIL+1)); }
PASSED=0

# JSON assertions used to shell out to `jq`.  jq is present on the GitHub
# ubuntu runners but is NOT installed with Git for Windows, so this script
# could only ever run in CI — despite the header claiming it is "also safe to
# run locally against a dev stack".  That claim was untestable on the primary
# development platform, which is where the desktop app it probes actually runs.
#
# Python is guaranteed present (this is a Python project, and CI runs it), so
# it replaces jq outright rather than sitting beside it — one implementation,
# no per-platform branch.  Expressions are Python against `d`, the decoded body.
#
# Pick the interpreter by PROVING it runs Python, never by `command -v`.
# On Windows, `python3` resolves to the Microsoft Store app-execution alias
# (…/WindowsApps/python3), which IS on PATH and DOES satisfy `command -v` —
# it just prints "Python was not found; run without arguments to install from
# the Microsoft Store" and exits non-zero.  A name check selects it and every
# assertion then fails identically to a failed assertion, so the suite reports
# probe failures instead of "your interpreter is a stub".
#
# Same shape as the Git-Bash-vs-WSL `bash` alias that made builds pass or fail
# depending on shell provenance: an alias occupying the name of a tool it
# cannot perform.  A name is not a capability — run it and check the answer.
_py_works() { [[ "$("$1" -c 'print(1+1)' 2>/dev/null)" == "2" ]]; }

PY="${NUNBA_PROBE_PYTHON:-}"
if [[ -n "$PY" ]]; then
    _py_works "$PY" || { echo "[probe] FATAL: NUNBA_PROBE_PYTHON='$PY' does not run Python" >&2; exit 3; }
else
    for _cand in python3 python py; do
        if _py_works "$_cand"; then PY="$_cand"; break; fi
    done
    if [[ -z "$PY" ]]; then
        echo "[probe] FATAL: no working Python found (tried python3, python, py)." >&2
        echo "[probe] Note: a bare 'python3' on PATH may be the Microsoft Store alias," >&2
        echo "[probe] which is not an interpreter.  Set NUNBA_PROBE_PYTHON to a real one." >&2
        exit 3
    fi
fi

# json_ok <json-body> <python-expr-over-d>  -> exit 0 when the expr is truthy
json_ok() {
    printf '%s' "$1" | "$PY" -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(1)
sys.exit(0 if eval(sys.argv[1]) else 1)
' "$2" >/dev/null 2>&1
}

# assert_status <label> <expected> <method> <path> [curl-args...]
assert_status() {
    local label="$1"; local want="$2"; local method="$3"; local path="$4"
    shift 4
    local got
    got="$(curl -s -o /tmp/probe.body -w '%{http_code}' -X "$method" "$BASE$path" "$@" || echo '000')"
    if [[ "$got" == "$want" ]]; then
        pass "$label -> $got"
    else
        fail "$label -> got $got want $want (body: $(head -c 200 /tmp/probe.body))"
    fi
}

# assert_json_field <label> <method> <path> <python-expr-over-d> [curl-args...]
assert_json_field() {
    local label="$1"; local method="$2"; local path="$3"; local expr="$4"
    shift 4
    local body
    body="$(curl -sS -X "$method" "$BASE$path" "$@" || echo '{}')"
    if json_ok "$body" "$expr"; then
        pass "$label -> $expr"
    else
        fail "$label -> missing/false $expr (body: $(printf '%s' "$body" | head -c 200))"
    fi
}

log "Target: $BASE"
# Report the SOURCE, never the token itself.  When the authed MCP check
# fails, this line is what distinguishes "the app rejected a real token"
# (a genuine defect) from "we sent a placeholder" (a harness gap).
log "MCP bearer: $TOKEN_SRC"

# ---- 0. Readiness gate: is the REAL app answering, or the boot stub? -----
# On desktop, app.py serves a placeholder Flask app (`gui_app`) until main.py
# finishes importing, and hands over by assigning app.py's `flask_app`.  The
# stub answers /health with 200 — so probe 1 below passes against it, as do
# most others.  Only probe 8 would have caught it, seven misleading results
# later, and its message would blame gpu_tier rather than the handover.
#
# This is not hypothetical.  On 2026-08-04 a missing packages[] entry made
# main.py's import raise ModuleNotFoundError; app.py logged "[STARTUP] main.py
# import exception ... Continuing with lightweight gui_app" and the stub served
# every request for hours.  A full round of cross-stack results was collected
# against it and all of it had to be thrown away — the probes were measuring
# app.py, not Nunba.
#
# So: establish WHICH app is answering before believing anything it says.
# The old fixed `sleep 5` is replaced by a real readiness wait, which also
# stops the suite racing a still-booting app in CI.
READY_TIMEOUT="${NUNBA_READY_TIMEOUT:-90}"
log "Waiting up to ${READY_TIMEOUT}s for the real app (not the boot stub)..."

_waited=0
_health=''
while [[ "$_waited" -lt "$READY_TIMEOUT" ]]; do
    _health="$(curl -sS --max-time 10 "$BASE/backend/health" 2>/dev/null || echo '{}')"
    # The stub sets loading:true and never emits gpu_tier; the real app does
    # the reverse.  Require the POSITIVE signal, not merely the absence of the
    # negative one — "no loading flag" is also true of an empty body.
    if json_ok "$_health" 'isinstance(d.get("gpu_tier"), str)'; then
        pass "readiness: real app answering (gpu_tier present) after ${_waited}s"
        break
    fi
    sleep 3
    _waited=$((_waited+3))
done

if ! json_ok "$_health" 'isinstance(d.get("gpu_tier"), str)'; then
    fail "readiness: real app never took over within ${READY_TIMEOUT}s"
    printf '\033[31m[probe] /backend/health said: %s\033[0m\n' "$(printf '%s' "$_health" | head -c 300)"
    if json_ok "$_health" 'd.get("loading") is True'; then
        cat >&2 <<'STUB'
[probe] That is app.py's BOOT STUB, not main.py's Flask app.  Every probe
[probe] below would measure the stub and most of them would PASS, which is
[probe] worse than failing.  Aborting instead.
[probe]
[probe] Check the desktop log for the handover:
[probe]   ~/Documents/Nunba/logs/gui_app.log
[probe]   grep "\[STARTUP\]"   -> expect "main.py imported successfully"
[probe]   if you see "main.py import exception" instead, that traceback is
[probe]   the real bug; a missing scripts/setup_freeze_nunba.py packages[]
[probe]   entry is the usual cause (see tests/test_freeze_packages_complete.py).
STUB
    fi
    exit 2
fi

# ---- 1. Flask base health ------------------------------------------------
assert_status "GET /health" 200 GET /health

# ---- 2. MCP local endpoint reachable ------------------------------------
assert_status "GET /api/mcp/local/health" 200 GET /api/mcp/local/health

# ---- 3. MCP exec WITHOUT bearer -> must 403 (auth gate enforced) --------
assert_status "POST /api/mcp/local/tools/execute (no auth)" 403 POST \
    /api/mcp/local/tools/execute \
    -H "Content-Type: application/json" \
    -d '{"tool":"system_health","args":{}}'

# ---- 4. MCP exec WITH bearer -> 200 -------------------------------------
assert_status "POST /api/mcp/local/tools/execute (authed)" 200 POST \
    /api/mcp/local/tools/execute \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"tool":"system_health","args":{}}'

# ---- 5. HF supply-chain: homoglyph 'a\u00ed4bharat' (Cyrillic/Latin mix) -> 400
assert_status "POST hub/install homoglyph repo" 400 POST \
    /api/admin/models/hub/install \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"repo_id":"a\u00ed4bharat/indictrans2-en-indic-dist-200M"}'

# ---- 6. HF supply-chain: random org, no confirm flag -> 403 -------------
# Include `category` so the request passes the field-presence validators
# and reaches the trusted-org gate (which is the contract under test).
# Without category, the endpoint returns 400 "unknown category" before
# the trusted-org check fires.
assert_status "POST hub/install random-org no-confirm" 403 POST \
    /api/admin/models/hub/install \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"repo_id":"randouser/some-random-model","category":"tts"}'

# ---- 7. Admin diag thread-dump -> 200 + threads_dumped field ------------
assert_json_field "POST /api/admin/diag/thread-dump has threads_dumped" POST \
    /api/admin/diag/thread-dump 'd.get("threads_dumped", 0) > 0' \
    -H "Authorization: Bearer $TOKEN"

# ---- 8. HART backend health -> 200 + gpu_tier ---------------------------
assert_json_field "GET /backend/health has gpu_tier" GET \
    /backend/health 'isinstance(d.get("gpu_tier"), str)'

# ---- 9-12. Hevolve AI hop (social / canonical DB) ----------------------
# Nunba -> HARTOS -> Hevolve AI.  The suite previously "covered" this leg with
# the hub/install supply-chain probes, but those are HARTOS admin endpoints —
# the Hevolve AI layer is the social/DB tier backed by hevolve-database's
# SocialUser/SocialPost.  Nothing exercised it, and nothing exercised auth.
#
# Needs a real JWT, so: log in to a fixed probe account, and only register if
# that fails.  Login-first keeps the steady state side-effect free — a health
# probe that creates a DB row on every run is a leak, not a check.
#
# Routes are read out of HARTOS/integrations/social/api.py.  `/users/me` is NOT
# one of them (it is `/auth/me`); probing the invented name returned 404 and
# would have been reported as a broken feature, which is exactly the mistake
# that produced two false "hive is down" writeups.
PROBE_USER="${NUNBA_PROBE_USER:-e2e_probe_fixed}"
PROBE_PASS="${NUNBA_PROBE_PASS:-Probe!Pass123}"
_login_body="{\"username\":\"$PROBE_USER\",\"password\":\"$PROBE_PASS\"}"
_jwt="$(curl -sS -X POST "$BASE/api/social/auth/login" -H 'Content-Type: application/json' \
        -d "$_login_body" --max-time 40 2>/dev/null \
        | "$PY" -c 'import json,sys
try: print(json.load(sys.stdin).get("data",{}).get("token") or "")
except Exception: print("")' 2>/dev/null)"
if [[ -z "$_jwt" ]]; then
    curl -sS -X POST "$BASE/api/social/auth/register" -H 'Content-Type: application/json' \
        -d "{\"username\":\"$PROBE_USER\",\"email\":\"$PROBE_USER@probe.local\",\"password\":\"$PROBE_PASS\"}" \
        --max-time 40 >/dev/null 2>&1
    _jwt="$(curl -sS -X POST "$BASE/api/social/auth/login" -H 'Content-Type: application/json' \
            -d "$_login_body" --max-time 40 2>/dev/null \
            | "$PY" -c 'import json,sys
try: print(json.load(sys.stdin).get("data",{}).get("token") or "")
except Exception: print("")' 2>/dev/null)"
fi

if [[ -n "$_jwt" ]]; then
    pass "social auth: register+login yielded a JWT (${#_jwt} chars)"
    assert_json_field "GET /api/social/auth/me (Nunba->HARTOS->Hevolve AI)" GET \
        /api/social/auth/me 'isinstance(d.get("data"), dict) and "username" in d["data"]' \
        -H "Authorization: Bearer $_jwt"
    assert_json_field "GET /api/social/feed (canonical SocialPost)" GET \
        /api/social/feed 'isinstance(d.get("data"), list)' \
        -H "Authorization: Bearer $_jwt"
    # The gate must DISCRIMINATE, not merely exist: same route, no token.
    assert_status "GET /api/social/auth/me (no auth) -> 401" 401 GET /api/social/auth/me
else
    fail "social auth: could not obtain a JWT — Hevolve AI hop not exercised"
fi

# ---- 13-14. Hive session hop -------------------------------------------
# Nunba -> HARTOS -> Hive.  Routes are taken from the blueprint that defines
# them, HARTOS/integrations/coding_agent/claude_hive_session.py:1339-1401:
#   connect | disconnect | status | pause | resume | scope | tasks
#   | task/<task_id>/result
# Only the two GET verbs are probed — the rest mutate session state, which a
# health probe has no business doing.
#
# Probing invented route names cost two wrong "hive is down" reports earlier
# (a `/list` verb that never existed).  A 404 from a name nobody implemented
# looks exactly like a 404 from a broken feature, so the endpoint list is
# derived from the source of truth rather than from memory.
assert_json_field "GET /api/hive/session/status (Nunba->HARTOS->Hive)" GET \
    /api/hive/session/status 'isinstance(d, dict) and "capabilities" in d'
assert_json_field "GET /api/hive/session/tasks (Hive task queue)" GET \
    /api/hive/session/tasks 'isinstance(d, dict) and "pending" in d and "completed" in d'

# ---- Summary ------------------------------------------------------------
echo
if [[ "$FAIL" -eq 0 ]]; then
    # Count, don't hardcode.  This said "all 8 probes passed" while running 11
    # — the literal was written when there were 8 and never moved.  A summary
    # that states a number it does not measure is the same defect this file's
    # readiness gate exists to prevent, one line lower.
    printf '\033[32m[probe] all %d checks passed\033[0m\n' "$PASSED"
    exit 0
else
    printf '\033[31m[probe] %d probe(s) failed -- see above\033[0m\n' "$FAIL"
    exit 1
fi
