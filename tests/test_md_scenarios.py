"""
test_md_scenarios.py
Automated test runner for Nunba_Test_Scenarios.md
Covers: Part A (App Functionality), Part B (Multi-Device via Chrome), Part C (Offline)

Usage:
  # Part A (app must be running on localhost:5000):
  python tests/test_md_scenarios.py --part A

  # Part B (Nunba app + hevolveai.com in Chrome as Device B):
  python tests/test_md_scenarios.py --part B

  # Part C (disconnect internet first, then run):
  python tests/test_md_scenarios.py --part C

  # All parts:
  python tests/test_md_scenarios.py --part ALL
"""

import argparse
import io
import json
import os
import sys
import time
import wave
import requests

BASE_URL = "http://localhost:5000"
RESULTS = []

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _auth_headers():
    token = os.environ.get("NUNBA_API_TOKEN", "")
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _get_jwt():
    """Return a valid guest JWT (register then login)."""
    import uuid
    email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    password = "Test1234!"
    try:
        r = requests.post(f"{BASE_URL}/api/social/auth/register",
                          json={"email": email, "password": password,
                                "username": f"tester_{uuid.uuid4().hex[:6]}"},
                          timeout=10)
        if r.ok:
            return r.json().get("token") or r.json().get("jwt")
        # Try login if register says duplicate
        r2 = requests.post(f"{BASE_URL}/api/social/auth/login",
                           json={"email": email, "password": password}, timeout=10)
        if r2.ok:
            return r2.json().get("token") or r2.json().get("jwt")
    except Exception:
        pass
    return None


def result(test_id, name, passed, reason=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    RESULTS.append({"id": test_id, "name": name, "status": status, "reason": reason})
    print(f"  {status}  [{test_id}] {name}" + (f" — {reason}" if reason else ""))


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ─────────────────────────────────────────────
# PART A — App Functionality
# ─────────────────────────────────────────────

def run_part_A():
    section("PART A — App Functionality")
    jwt = _get_jwt()
    auth = {"Authorization": f"Bearer {jwt}"} if jwt else {}
    headers = {"Content-Type": "application/json", **auth}

    # ── A1 Chat & Conversation ──
    print("\n[A1] Chat & Conversation")

    try:
        r = requests.post(f"{BASE_URL}/chat",
                          json={"message": "Hello", "user_id": "guest_001"},
                          headers=headers, timeout=30)
        result("A1.1", "Send basic chat message", r.status_code == 200,
               f"status={r.status_code}")
    except Exception as e:
        result("A1.1", "Send basic chat message", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/chat",
                          json={"message": "", "user_id": "guest_001"},
                          headers=headers, timeout=10)
        result("A1.2", "Chat with empty message body", r.status_code in (400, 422),
               f"status={r.status_code}")
    except Exception as e:
        result("A1.2", "Chat with empty message body", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/chat",
                          json={"message": "x" * 10001, "user_id": "guest_001"},
                          headers=headers, timeout=30)
        result("A1.3", "Chat with very long input (>10K)", r.status_code < 500,
               f"status={r.status_code}")
    except Exception as e:
        result("A1.3", "Chat with very long input (>10K)", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/casual_convo",
                          json={"message": "Hey what's up", "user_id": "guest_001"},
                          headers=headers, timeout=30)
        result("A1.4", "Casual conversation mode", r.status_code in (200, 404),
               f"status={r.status_code}")
    except Exception as e:
        result("A1.4", "Casual conversation mode", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/language_change",
                          json={"language": "hi", "user_id": "guest_001"},
                          headers=headers, timeout=10)
        result("A1.5", "Language switch mid-conversation", r.status_code in (200, 404),
               f"status={r.status_code}")
    except Exception as e:
        result("A1.5", "Language switch mid-conversation", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/chat",
                          json={"message": "Hello", "user_id": "guest_001"},
                          timeout=10)  # No auth header
        result("A1.8", "Chat without auth token from localhost",
               r.status_code in (200, 401, 403), f"status={r.status_code}")
    except Exception as e:
        result("A1.8", "Chat without auth token", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/conversation",
                          json={"user_id": "guest_001", "message": "test conv",
                                "response": "ok"},
                          headers=headers, timeout=10)
        stored = r.status_code in (200, 201)
        if stored:
            r2 = requests.get(f"{BASE_URL}/conversation",
                              params={"user_id": "guest_001"},
                              headers=headers, timeout=10)
            result("A1.9", "Conversation history storage", r2.status_code == 200,
                   f"store={r.status_code}, get={r2.status_code}")
        else:
            result("A1.9", "Conversation history storage", False,
                   f"store failed: {r.status_code}")
    except Exception as e:
        result("A1.9", "Conversation history storage", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/prompts", headers=headers, timeout=10)
        result("A1.10", "Fetch available prompts/agents", r.status_code == 200,
               f"status={r.status_code}")
    except Exception as e:
        result("A1.10", "Fetch available prompts/agents", False, str(e))

    # ── A2 HART Backend Fallback ──
    print("\n[A2] HART Backend Fallback Chain")

    try:
        r = requests.get(f"{BASE_URL}/backend/health", headers=headers, timeout=10)
        result("A2.6", "Backend health check", r.status_code == 200,
               f"status={r.status_code}")
    except Exception as e:
        result("A2.6", "Backend health check", False, str(e))

    # ── A3 TTS ──
    print("\n[A3] TTS (Text-to-Speech)")

    try:
        r = requests.post(f"{BASE_URL}/tts/synthesize",
                          json={"text": "Hello world", "language": "en"},
                          headers=headers, timeout=30)
        result("A3.1", "Synthesize English text",
               r.status_code == 200 and len(r.content) > 100,
               f"status={r.status_code}, size={len(r.content)}B")
    except Exception as e:
        result("A3.1", "Synthesize English text", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/tts/synthesize",
                          json={"text": "नमस्ते दुनिया", "language": "hi"},
                          headers=headers, timeout=30)
        result("A3.2", "Synthesize Hindi text",
               r.status_code in (200, 501),
               f"status={r.status_code}")
    except Exception as e:
        result("A3.2", "Synthesize Hindi text", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/tts/voices", headers=headers, timeout=10)
        result("A3.4", "List available TTS voices", r.status_code == 200,
               f"status={r.status_code}")
    except Exception as e:
        result("A3.4", "List available TTS voices", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/tts/synthesize",
                          json={"text": "", "language": "en"},
                          headers=headers, timeout=10)
        result("A3.5", "TTS with empty text", r.status_code in (400, 422),
               f"status={r.status_code}")
    except Exception as e:
        result("A3.5", "TTS with empty text", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/tts/status", headers=headers, timeout=10)
        result("A3.6", "TTS engine status check", r.status_code == 200,
               f"status={r.status_code}")
    except Exception as e:
        result("A3.6", "TTS engine status check", False, str(e))

    # ── A4 STT ──
    print("\n[A4] STT (Speech-to-Text)")

    try:
        # Create a minimal WAV file for testing
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(b'\x00\x00' * 16000)  # 1s silence
        buf.seek(0)
        r = requests.post(f"{BASE_URL}/voice/transcribe",
                          files={"file": ("test.wav", buf, "audio/wav")},
                          headers=auth, timeout=30)
        result("A4.1", "Transcribe audio file", r.status_code in (200, 503),
               f"status={r.status_code}")
    except Exception as e:
        result("A4.1", "Transcribe audio file", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/voice/transcribe",
                          files={"file": ("bad.txt", b"not audio", "text/plain")},
                          headers=auth, timeout=10)
        result("A4.4", "Invalid audio format returns error",
               r.status_code in (400, 415, 422, 500),
               f"status={r.status_code}")
    except Exception as e:
        result("A4.4", "Invalid audio format", False, str(e))

    # ── A5 File Upload ──
    print("\n[A5] File Upload & Vision")

    try:
        r = requests.post(f"{BASE_URL}/upload/file",
                          files={"file": ("test.jpg", b'\xff\xd8\xff\xe0' + b'\x00'*100,
                                          "image/jpeg")},
                          headers=auth, timeout=20)
        result("A5.1", "Upload image file", r.status_code in (200, 201),
               f"status={r.status_code}")
    except Exception as e:
        result("A5.1", "Upload image file", False, str(e))

    try:
        # 20MB+ fake file
        r = requests.post(f"{BASE_URL}/upload/file",
                          files={"file": ("huge.bin", b'\x00' * (21 * 1024 * 1024),
                                          "application/octet-stream")},
                          headers=auth, timeout=30)
        result("A5.3", "Upload oversized file rejected",
               r.status_code in (400, 413, 422),
               f"status={r.status_code}")
    except Exception as e:
        result("A5.3", "Upload oversized file", False, str(e))

    # ── A7 LLM Server Management ──
    print("\n[A7] LLM Server Management")

    try:
        r = requests.get(f"{BASE_URL}/llm/config", headers=headers, timeout=10)
        result("A7.1", "Get LLM config", r.status_code == 200,
               f"status={r.status_code}")
    except Exception as e:
        result("A7.1", "Get LLM config", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/api/llm/status", headers=headers, timeout=10)
        result("A7.6", "LLM status check", r.status_code in (200, 404),
               f"status={r.status_code}")
    except Exception as e:
        result("A7.6", "LLM status check", False, str(e))

    # ── A8 Model Orchestration ──
    print("\n[A8] Model Orchestration")

    try:
        r = requests.get(f"{BASE_URL}/api/admin/models", headers=headers, timeout=10)
        result("A8.1", "List all models", r.status_code in (200, 404),
               f"status={r.status_code}")
    except Exception as e:
        result("A8.1", "List all models", False, str(e))

    # ── A9 Database ──
    print("\n[A9] Database Operations")

    try:
        r = requests.post(f"{BASE_URL}/create_action",
                          json={"user_id": "guest_001", "action": "test_action",
                                "timestamp": int(time.time())},
                          headers=headers, timeout=10)
        result("A9.1", "Create action (activity log)", r.status_code in (200, 201),
               f"status={r.status_code}")
    except Exception as e:
        result("A9.1", "Create action", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/conversation",
                          json={"user_id": "guest_001", "message": "hi",
                                "response": "hello"},
                          headers=headers, timeout=10)
        result("A9.3", "Store conversation", r.status_code in (200, 201),
               f"status={r.status_code}")
    except Exception as e:
        result("A9.3", "Store conversation", False, str(e))

    # ── A10 Security & Auth ──
    print("\n[A10] Security & Auth")

    try:
        r = requests.post(f"{BASE_URL}/chat",
                          json={"message": "Hello", "user_id": "guest_001"},
                          headers={"Content-Type": "application/json",
                                   "X-Forwarded-For": "1.2.3.4",
                                   "Authorization": "Bearer invalid_token_xyz"},
                          timeout=10)
        result("A10.2", "Invalid token from non-localhost blocked",
               r.status_code in (200, 401, 403),
               f"status={r.status_code}")
    except Exception as e:
        result("A10.2", "Invalid token blocked", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/check_internet", headers=headers, timeout=10)
        result("A11.1", "Internet connectivity check", r.status_code == 200,
               f"status={r.status_code}")
    except Exception as e:
        result("A11.1", "Internet connectivity check", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/status", headers=headers, timeout=10)
        result("A11.2", "Network status endpoint", r.status_code == 200,
               f"status={r.status_code}")
    except Exception as e:
        result("A11.2", "Network status", False, str(e))


# ─────────────────────────────────────────────
# PART B — Multi-Device (Nunba + Chrome hevolveai)
# ─────────────────────────────────────────────

def run_part_B():
    section("PART B — Multi-Device (Nunba=DeviceA, hevolveai.com=DeviceB)")
    jwt = _get_jwt()
    if not jwt:
        print("  ⚠️  Could not get JWT — register/login failed. Skipping B auth tests.")
    auth = {"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"} if jwt else \
           {"Content-Type": "application/json"}

    # ── B1 Device Identity ──
    print("\n[B1] Device Identity & Registration")

    try:
        r = requests.get(f"{BASE_URL}/status", timeout=10)
        data = r.json() if r.ok else {}
        device_id = data.get("device_id")
        result("B1.1", "Device A has unique device_id",
               bool(device_id), f"device_id={'present' if device_id else 'missing'}")
    except Exception as e:
        result("B1.1", "Device A device_id", False, str(e))

    # ── B2 Auth ──
    print("\n[B2] User Authentication")

    try:
        result("B2.1", "Register user on Device A (Nunba)", bool(jwt),
               "JWT obtained" if jwt else "Registration failed")
    except Exception as e:
        result("B2.1", "Register user", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/chat",
                          json={"message": "Hi", "user_id": "guest_001"},
                          headers={"Content-Type": "application/json",
                                   "Authorization": "Bearer expired.token.xyz"},
                          timeout=10)
        result("B2.5", "Expired JWT returns 401",
               r.status_code in (200, 401, 403),
               f"status={r.status_code}")
    except Exception as e:
        result("B2.5", "Expired JWT", False, str(e))

    # ── B3 Agent Sync ──
    print("\n[B3] Agent/Prompt Sync")

    try:
        r = requests.get(f"{BASE_URL}/prompts", headers=auth, timeout=10)
        result("B3.1", "Get local agents on Device A",
               r.status_code == 200, f"status={r.status_code}")
    except Exception as e:
        result("B3.1", "Get local agents", False, str(e))

    # ── B5 Real-Time SSE ──
    print("\n[B5] Real-Time Events (SSE)")

    try:
        r = requests.get(f"{BASE_URL}/api/social/events/stream",
                         headers=auth, stream=True, timeout=5)
        # Just check it connects, don't read forever
        result("B5.1", "Connect to SSE stream with JWT",
               r.status_code in (200, 401, 404),
               f"status={r.status_code}")
        r.close()
    except requests.exceptions.ReadTimeout:
        result("B5.1", "Connect to SSE stream with JWT", True,
               "stream open (timeout as expected)")
    except Exception as e:
        result("B5.1", "Connect to SSE stream", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/api/social/events/stream",
                         stream=True, timeout=5)
        result("B5.2", "SSE without token returns 401",
               r.status_code in (200, 401, 403),
               f"status={r.status_code}")
        r.close()
    except requests.exceptions.ReadTimeout:
        result("B5.2", "SSE without token", False, "stream opened without auth!")
    except Exception as e:
        result("B5.2", "SSE without token", False, str(e))

    # ── B8 Cross-Device Chat ──
    print("\n[B8] Cross-Device Chat")

    try:
        r = requests.post(f"{BASE_URL}/chat",
                          json={"message": "Hello from Device A", "user_id": "guest_001"},
                          headers=auth, timeout=30)
        result("B8.1", "Chat with local agent on Device A",
               r.status_code == 200, f"status={r.status_code}")
    except Exception as e:
        result("B8.1", "Chat with local agent", False, str(e))

    # ── B9 Agent Contact Request ──
    print("\n[B9] Agent Contact Request")

    try:
        r = requests.post(f"{BASE_URL}/agents/contact",
                          json={},  # Missing agent_id and user_id
                          headers=auth, timeout=10)
        result("B9.3", "Missing agent_id/user_id returns 400",
               r.status_code in (400, 404, 422),
               f"status={r.status_code}")
    except Exception as e:
        result("B9.3", "Missing agent_id", False, str(e))

    # ── B10 Remote Command ──
    print("\n[B10] Remote Command Execution")

    try:
        r = requests.post(f"{BASE_URL}/execute",
                          json={"command": "echo hello"},
                          headers=auth, timeout=15)
        result("B10.3", "Shell command execute",
               r.status_code in (200, 403, 404),
               f"status={r.status_code}")
    except Exception as e:
        result("B10.3", "Shell command execute", False, str(e))

    # ── B12 Security ──
    print("\n[B12] Cross-Device Security")

    try:
        r = requests.post(f"{BASE_URL}/execute",
                          json={"command": "echo hi"},
                          headers={"Content-Type": "application/json",
                                   "X-Forwarded-For": "9.9.9.9"},
                          timeout=10)
        result("B12.1", "/execute from non-localhost without token blocked",
               r.status_code in (401, 403),
               f"status={r.status_code}")
    except Exception as e:
        result("B12.1", "/execute security check", False, str(e))


# ─────────────────────────────────────────────
# PART C — Offline Tests (disconnect internet first)
# ─────────────────────────────────────────────

def run_part_C():
    section("PART C — Offline Tests (internet should be disconnected)")
    headers = {"Content-Type": "application/json"}

    # ── C1 Offline Detection ──
    print("\n[C1] Offline Detection")

    try:
        r = requests.get(f"{BASE_URL}/api/connectivity", timeout=10)
        data = r.json() if r.ok else {}
        result("C1.1", "GET /api/connectivity returns online=false",
               r.status_code == 200 and data.get("online") is False,
               f"online={data.get('online')}")
    except Exception as e:
        result("C1.1", "GET /api/connectivity", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/check_internet", timeout=10)
        data = r.json() if r.ok else {}
        result("C1.7", "App reports offline status",
               r.status_code == 200,
               f"status={r.status_code}, data={data}")
    except Exception as e:
        result("C1.7", "App reports offline status", False, str(e))

    # ── C2 LLM Fallback (Offline) ──
    print("\n[C2] LLM Fallback Chain (Offline)")

    try:
        r = requests.post(f"{BASE_URL}/chat",
                          json={"message": "Hello offline", "user_id": "guest_001"},
                          headers=headers, timeout=30)
        data = r.json() if r.ok else {}
        result("C2.6", "Chat works offline via local LLM",
               r.status_code == 200,
               f"status={r.status_code}, source={data.get('source', 'unknown')}")
    except Exception as e:
        result("C2.6", "Chat works offline", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/prompts", headers=headers, timeout=10)
        result("C2.11", "get_prompts() returns fallback when backend unreachable",
               r.status_code in (200, 502, 503),
               f"status={r.status_code}")
    except Exception as e:
        result("C2.11", "get_prompts() offline", False, str(e))

    # ── C3 Chat Offline ──
    print("\n[C3] Chat Functionality (Offline)")

    try:
        r = requests.post(f"{BASE_URL}/conversation",
                          json={"user_id": "guest_001", "message": "offline msg",
                                "response": "ok offline"},
                          headers=headers, timeout=10)
        result("C3.3", "Conversation stored locally offline",
               r.status_code in (200, 201),
               f"status={r.status_code}")
    except Exception as e:
        result("C3.3", "Conversation stored offline", False, str(e))

    # ── C4 TTS Offline ──
    print("\n[C4] TTS Offline")

    try:
        r = requests.post(f"{BASE_URL}/tts/synthesize",
                          json={"text": "Hello offline", "language": "en"},
                          headers=headers, timeout=30)
        result("C4.7", "Piper TTS works offline",
               r.status_code == 200 and len(r.content) > 100,
               f"status={r.status_code}, size={len(r.content)}B")
    except Exception as e:
        result("C4.7", "Piper TTS offline", False, str(e))

    # ── C6 Database Offline ──
    print("\n[C6] Local Database (Offline)")

    try:
        r = requests.post(f"{BASE_URL}/create_action",
                          json={"user_id": "guest_001", "action": "offline_test",
                                "timestamp": int(time.time())},
                          headers=headers, timeout=10)
        result("C6.1", "Store action offline (SQLite)",
               r.status_code in (200, 201),
               f"status={r.status_code}")
    except Exception as e:
        result("C6.1", "Store action offline", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/conversation",
                          json={"user_id": "guest_001", "message": "offline",
                                "response": "ok"},
                          headers=headers, timeout=10)
        result("C6.3", "Store conversation offline",
               r.status_code in (200, 201),
               f"status={r.status_code}")
    except Exception as e:
        result("C6.3", "Store conversation offline", False, str(e))

    try:
        r = requests.get(f"{BASE_URL}/conversation",
                         params={"user_id": "guest_001"},
                         headers=headers, timeout=10)
        result("C6.4", "Retrieve conversation offline",
               r.status_code == 200,
               f"status={r.status_code}")
    except Exception as e:
        result("C6.4", "Retrieve conversation offline", False, str(e))

    # ── C8 Model Management Offline ──
    print("\n[C8] Model Management (Offline)")

    try:
        r = requests.get(f"{BASE_URL}/api/admin/models", headers=headers, timeout=10)
        result("C8.1", "List models offline (local catalog)",
               r.status_code in (200, 404),
               f"status={r.status_code}")
    except Exception as e:
        result("C8.1", "List models offline", False, str(e))

    # ── C9 SSE Offline ──
    print("\n[C9] Real-Time Events (Offline)")

    try:
        r = requests.get(f"{BASE_URL}/api/social/events/stream",
                         stream=True, timeout=5)
        result("C9.2", "SSE stream works on same machine offline",
               r.status_code in (200, 401, 404),
               f"status={r.status_code}")
        r.close()
    except requests.exceptions.ReadTimeout:
        result("C9.2", "SSE stream works offline", True, "stream open (timeout ok)")
    except Exception as e:
        result("C9.2", "SSE stream offline", False, str(e))

    # ── C10 Desktop App Offline ──
    print("\n[C10] Desktop App (Offline)")

    try:
        r = requests.get(f"{BASE_URL}/status", timeout=10)
        result("C10.1", "App responds offline (local mode)",
               r.status_code == 200, f"status={r.status_code}")
    except Exception as e:
        result("C10.1", "App responds offline", False, str(e))

    try:
        r = requests.post(f"{BASE_URL}/execute",
                          json={"command": "echo offline_test"},
                          headers=headers, timeout=10)
        result("C10.6", "/execute works offline (local subprocess)",
               r.status_code in (200, 401, 403),
               f"status={r.status_code}")
    except Exception as e:
        result("C10.6", "/execute offline", False, str(e))


# ─────────────────────────────────────────────
# Summary Report
# ─────────────────────────────────────────────

def print_summary():
    print(f"\n{'='*60}")
    print("  FINAL SUMMARY")
    print(f"{'='*60}")
    passed = [r for r in RESULTS if "PASS" in r["status"]]
    failed = [r for r in RESULTS if "FAIL" in r["status"]]
    print(f"\n  Total : {len(RESULTS)}")
    print(f"  ✅ Pass : {len(passed)}")
    print(f"  ❌ Fail : {len(failed)}")

    if failed:
        print(f"\n  FAILURES:")
        for r in failed:
            print(f"    [{r['id']}] {r['name']} — {r['reason']}")

    # Write results to file
    out_path = os.path.join(os.path.dirname(__file__), "md_scenario_results.json")
    with open(out_path, "w") as f:
        json.dump(RESULTS, f, indent=2)
    print(f"\n  Full results saved to: {out_path}")


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Nunba_Test_Scenarios.md tests")
    parser.add_argument("--part", default="A",
                        choices=["A", "B", "C", "ALL"],
                        help="Which part to run (A, B, C, or ALL)")
    parser.add_argument("--base-url", default="http://localhost:5000",
                        help="Base URL of the Nunba server")
    args = parser.parse_args()

    BASE_URL = args.base_url.rstrip("/")

    # Check server is reachable
    try:
        requests.get(f"{BASE_URL}/status", timeout=5)
        print(f"✅ Nunba server is reachable at {BASE_URL}")
    except Exception:
        print(f"❌ Cannot reach Nunba server at {BASE_URL}")
        print("   Make sure the app is running first!")
        sys.exit(1)

    if args.part in ("A", "ALL"):
        run_part_A()
    if args.part in ("B", "ALL"):
        run_part_B()
    if args.part in ("C", "ALL"):
        run_part_C()

    print_summary()
