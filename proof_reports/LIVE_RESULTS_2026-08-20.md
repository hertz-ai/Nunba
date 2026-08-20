# Live verification results — 2026-08-20 boot (frozen bundle, PID 39928)

Run: `build\Nunba\Nunba.exe`, launched 12:27:59, CWD pinned to the bundle.
`sys.frozen` true; python-embed + `vendor/hevolveai_armored` adjacent; logging to
`~/Documents/Nunba/logs/`. NOT literally the Program Files install — see CAVEAT.
Markers were fixed in MARKER_TABLE_2026-08-20.md BEFORE any log was read.

## VERIFIED — 4 of 72

| commit | how | evidence |
|---|---|---|
| **5871c37b** repo-mode is dev-only | live log | `hevolveai_supervisor: spawning ...\build\Nunba\python-embed\python.exe -c import os`; `supervisor started: port=8000 job_object_bound=True`; **`Python310` mentions = 0** in the boot window (previously it ALWAYS spawned `C:\Python310` + the checkout). argv is the `-c` armor branch, confirmed by content: `import os` is the first line of `_ARMOR_INSTALL_SNIPPET`. Whisper also spawns under python-embed. |
| **77480071** /agents deep links | driven HTTP | 4-way discrimination on the running app: `/agents/researcher` + browser Accept -> **200 SPA** (20680 B); `/agents/Hevolve` + browser Accept -> **200 SPA**; same path + `Accept: application/json` -> **404 JSON**; `/agents/sync` -> **401** (real API resolves, auth-gated, not swallowed by the SPA). Matches the commit's own asserts. Closes #642 "NOT live-verified in frozen build"; confirms a877e26a (#628) not regressed. |
| **69b7f8ca** /peer_link both paths | driven WS | `/peer_link` with a real upgrade -> **101 Switching Protocols**. Plain GET returned the SPA catch-all — the #603 "200 but it's index.html" trap. 101 is a completed handshake. |
| **7dbf86c3** AI-setup gate | shipped code executed | Bundle interpreter, this box: `model_path=None` -> OLD path-only check **False** ("no model"); canonical detector **True, 3 presets**. Reproduces the commit's exact claim ("said no model while three were downloaded"). |

## NOT VERIFIABLE from this evidence — and why (do NOT count as passed)

- **f30795cb** — MY MARKER WAS WRONG. I wrote "device must read `cuda:0`/`cpu`, never
  `gpu`", but the fix computes `_device = 'gpu' if _on_gpu else 'cpu'` — `'gpu'` is a
  LEGAL output and `cuda:0` is never produced. `/api/admin/models` returns
  `"device":"gpu"` and `/backend/health` reports `cuda_available:true` on an RTX 3070,
  so that is the CORRECT value. I nearly filed a false regression off my own bad marker.
  Worse: on a GPU box the buggy hardcode and the fixed computation emit the SAME string,
  so the value can never discriminate here. The real discriminator is the log suffix
  `marked as loaded on <device>` (new in this commit) — **0 occurrences before AND after**,
  because the "server already running" early-return branch never executed. Status: the
  changed branch did not run; unproven either way.
- **9a2997e0** ("Loading model"), **c17529a7** (image_gen) — the marker strings are
  absent from EVERY log, pre-fix rotations included. Non-discriminating markers.
- **32f0232c** (`/metrics/queue`, `/metrics/latency`) — absent from every log; they are
  HTTP endpoints. Both return 401 and need an admin JWT. Obtaining one requires password
  entry / account creation, which the standing security constraint prohibits.
  **BLOCKED BY POLICY**, not failed.

## CAVEAT that limits every result above

The main cx_Freeze process reached the **HARTOS checkout and the repo `.venv`**:
two tracebacks resolve `hart_intelligence_entry` to
`C:\Users\sathi\PycharmProjects\HARTOS\` and `transformers` to
`...Nunba-HART-Companion\.venv\Lib\site-packages\`. These are live imports, not baked
`.pyc` paths — the bundle ships its own `hart_intelligence_entry.py` (599 KB, 11:58 today)
and there is **no `.pyc`**. Confined to window lines 1480-1527 of 2,875; the other 2,863
lines are clean. This is task #376's isolation leak, still live when the bundle runs from
inside the repo tree. It does not invalidate the four results above (all are outcome
measurements — child argv, HTTP status, WS handshake, executed predicate), but it is the
reason the user pinned the standard to the Program Files install. A true-install pass is
still required and is blocked on UAC.

## Running count
**4 verified / 72.** Pre-committed honest ceiling from a passive boot was ~20; driven
HTTP/WS probes and executing shipped code raise what is reachable, but each item still
needs its own discriminating marker. 7 BUILD-class items are evidenced in build logs and
must NOT be reported as live.
