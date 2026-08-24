# Live Tool Sweep — 2026-08-22 (installed build 10:45, installed 11:09)

Driven against the LIVE installed Nunba on this machine. Chat-path tools were
invoked BY THE LLM through POST /chat (test user `tooltest-sweep-0822`,
video_req=false); MCP tools through the local JSON-RPC bridge; verification is
per-turn gui_app.log window markers + response payloads. Raw records:
`tool_sweep_results.jsonl` (chat path), `mcp_sweep_results.jsonl` (MCP),
`a2a_fanout_evidence.json` (A2A + SSE capture).

## Phase 1 — chat-path tools via LLM: 16/16 INVOKED
Calculator · google_search · Data_Extraction_From_URL · User_details_tool ·
FULL_HISTORY · remember (memory) · recall_memory (memory) · Text to image ·
Self_Critique_And_Enhance* · Suggest_Share_Worthy_Content · Request_Resource* ·
Agentic_Router · Create_Agent · Observe_User_Experience · OpenAPI_Specification ·
Animate_Character
(*invoked on retry with explicit must-use phrasing; first pass the model
answered inline — a routing choice, not a tool defect.)
Create_Agent: tool fired; HTTP wait exceeded 150s (long creation flow) — the
async pipeline completed (see Phase 3).

## Phase 2 — MCP bridge: 48 tools = 44 called OK + 1 defect-crash + 2 negative-path + 1 skip
- Read-only/status (22): all OK — incl. list_agents (96 experts), list_goals
  (463), list_routes (963), list_channels (29), system_health, runtime_integrity.
- Lifecycle proven end-to-end: remember→recall round-trip (stored+found);
  thought experiment create→vote→evaluate→tally→advance→iterate→status all
  success=true (id 3935ac61); create_hive_task (real id); hive
  connect/status/disconnect; start_auto_evolve bounded to 1 experiment
  (session d564aefda382); seed_goals; dispatch_hive_tasks (0 pending — correct,
  session scoped).
- Negative-path (side-effect-free): switch_model → clean "No GGUF repository
  found" validation. onboard_model → DEFECT, see findings.
- Skipped with reason (1): repair_backend_venv — mutates ~/.nunba mid-session;
  its underlying self-heal machinery was separately live-proven this morning
  (ctranslate2 quarantine path, 7b2da1ac).

## Phase 3 — A2A: PROVEN
Driven turn routed via Agentic_Router → Creation Mode → autogen
**GroupChat with 6 agents** (Assistant, Executor, UserProxy, ChatInstructor,
Helper, StatusVerifier), 5 memory tools registered on the agents,
select_speaker transform active, "All flows completed - agent creation ready".

## Phase 4 — fan-out: SSE PROVEN LIVE; WAMP degraded-by-design
- External SSE client on /api/social/events/stream received **39 events live**
  during the A2A turn (connected + chat.response/chat.pupit/message/
  task.confirmation types; sample in a2a_fanout_evidence.json). Per-turn
  broadcast_sse_event logs show targeted=1 delivery.
- In-process WAMP router: FROZE 12:09:26, watchdog restarted the thread, the
  restart FAILED to bind ("WAMP router did not start — realtime features will
  use SSE fallback"). Fan-out continuity held via the SSE fallback — the
  degradation path worked exactly as designed. Router rebind failure filed.
- TTS service leg: /tts/synthesize → HTTP 200 + real RIFF/WAVE audio (Piper).
  19 engine service tools are registry-exposed; uninstalled engines are
  install-gated by design (ladder selects installed ones).

## Defects found by this sweep (filed)
1. google_search silently empty — GOOGLE_API_KEY/GOOGLE_CSE_ID unset; combined
   with the refusal-override this produced a FABRICATED weather answer (#680,
   fix a95bb0ad in next build).
2. onboard_model returns {"status":"ready"} for a NONEXISTENT model id —
   fabricated readiness (#682).
3. watchdog_status MCP tool crashes: 'NodeWatchdog' object has no attribute
   'get_status' (#682).
4. score_hypothesis_result writes into C:\Program Files → WinError 5 (the #250
   family, resurfaced in experiments subsystem) (#682).
5. model_status reports active_model null / server_healthy false while the
   4B llama-server demonstrably serves chat (liveness vocabulary, #591 family)
   (#682).
6. autoresearch_setup baseline runs `python` — exit 9009 on a frozen install
   (no python on PATH); must resolve the embedded interpreter (#682).
7. wamp_router froze 12:09 + watchdog restart failed to rebind; SSE fallback
   carried realtime (#683).
8. LLM-CONTEXT empty request_id at recipe (autogen worker thread) — known #590.
