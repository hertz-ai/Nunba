# Validation pass 2026-08-23 — "validate everything I asked you to"

Installed build under test: nunba=7b2da1ac hartos=9ae6c3bf (user's 08-22 16:06 build),
warm process PID 2180. Drivers: scratchpad/validate_0823.py -> proof_reports/validate_0823.jsonl.

| # | Ask | Verdict | Evidence |
|---|-----|---------|----------|
| 1 | Casual chat sanity (zero regression) | PASS | "hi" -> "Hello! How can I assist you today?" 4.5s, draft path |
| 2 | Empty-tool fallback -> DIFFERENT tool (9ae6c3bf) | PASS 08-22 / NOT EXERCISED 08-23 | 08-22 live: google_search empty -> Data_Extraction_From_URL on AccuWeather. 08-23 the turn never reached tools (see #3) |
| 3 | No fabrication after honest tool-empty (a95bb0ad) | GUARD HOLDS, but NEW upstream leak | 08-23 09:41 weather: draft answered "hot and humid, monsoon clouds" delegate=none @0.95 (spec a4f2cc6d) — fabricated FINAL answer, no expert leg, no tools, no refusal-override involved. Fixed in 3044ce19 (prompt delegate summary bans live-data none) — needs install + re-drive |
| 4 | #684 creation-hijack gone (0ce26b91) | **OVERTURNED** — wedge still live | fresh user validate-0823, agent 90916249292: 'resumed - action complete' x16, 'All flows already completed' x2, raw 34-char stub as reply + TTS x3 + expert publish len=34 (spec 3ae45fe6). 0ce26b91 closed only the expert-leg payload door |
| 5 | 34-char expert stub identity | IDENTIFIED | 'Agent Already Created Successfully' (=34 chars), create_recipe.py:5907, reaches wire via hie Phase-2 fall-through |
| 6 | Root cause of #684 | PROVEN + FIXED 3044ce19 | set_flags_to_enter_review_mode logs "Going to reuse" but set review=True/convo=False -> Phase-2 recipe() on every turn on a completed agent. Renamed set_flags_to_enter_reuse_mode, flags flipped; Phase-2 handles Already; 3 red-first tests, 12/12 |
| 7 | Tool sweep #681 (50+ tools, A2A, fanout) | DONE 08-22 | proof_reports/tool_sweep_scorecard.md — 63 tools, A2A + SSE fanout proven |
| 8 | Install self-quarantine #678 (7b2da1ac) | PASS 08-22 | install log: broken user-site pkg quarantined |
| 9 | Boot window | MEASURED | 4m51s (16:34:19 server start -> 16:39:10 tools ready); "Loading tools" gate + bare-llama fallback = #661 |
| 10 | Unit suites | 12/12 | test_expert_dispatch_mode (7) + test_refusal_override_post_tool_guard (5) |

Open after this pass: install 3044ce19 build + re-drive BLUEFIN6 (expect real conversation + recall hit)
and weather (expect delegate!=none). Push to origin blocked by 403 (credential). #661 boot-window
queueing and thinking-regulation P0..P3 unchanged.

## Zero-regression path matrix for 3044ce19 (review vs reuse modes — user challenge 2026-08-23)

Flags are read ONLY in hart_intelligence_entry.py (ripgrep, both repos). Authoritative
semantic per hie:9348 comment: review_agents=True == "this user+prompt is MID-CREATION".

| Agent state at classifier | Pre-fix route (log-proven) | Post-fix route | Changed? |
|---|---|---|---|
| No config (new agent) | gather/create (:9155 branch) | same | no |
| Mid-creation, gather only | Phase 1 gather (creation writers :9436/:9468/:9528) | same | no |
| Config + flow-0 recipe MISSING | 9756 routing -> recipe -> Already -> convo=True; next turns Phase-3 doorway (#485 branch leaves flags) | same (set_flags requires flow-0 to EXIST; never called here) | no |
| Config + some flows built, last missing | :9127 "resuming CREATE" review=True -> Phase 2 resume | same | no |
| ALL flows built (completed) | set_flags review=True -> :9348 resume-guard forces create_agent=True -> Phase 2 recipe() -> stub/churn; reuse chat_agent UNREACHABLE | set_flags review=False/convo=True -> reuse chat_agent | YES (the defect row) |
| System agent | casual get_ans (prompt_id=None) | same | no |
| Same-process just-created | next turn re-clobbered to Phase 2 (CREATE group on chat turns — the #385 autogen.create@70.9s signature) | next turn reuse | YES (same defect row) |

Log evidence (gui_app.log 08-22 19:12 -> 08-23 10:3x): 'Going to reuse' 12x -> 'All flows
already completed' 12x (100% wedge); 'Agent being evaluated after creation' 0x; 'resumed -
action complete' 152x. Lifecycle store (10,365 DBs): agent 90916249292 post-completion
history is exclusively 'Review Mode: Agent details being reviewed' (the 9660 fall-through
stamp); 'Evaluation Mode' absent. Nothing that ran pre-fix is removed; the only changed row
had no working behavior to preserve.
