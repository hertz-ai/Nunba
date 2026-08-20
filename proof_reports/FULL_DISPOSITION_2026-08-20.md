# Complete disposition — all 65 commits, Nunba + HARTOS, 2026-08-18..20

Population counted BEFORE filtering: `git log --since 2026-08-18 --until 2026-08-21`
= 19 Nunba (2 are this session's own proof-report commits) + 46 HARTOS = **65**.
My earlier table assumed 72; that was wrong and is corrected here.

Evidence: the running frozen bundle (PID 39928, booted 12:27:59), its own
`~/Documents/Nunba/logs/`, driven HTTP/WS against it, and the shipped
`python-embed` tree. True pre-fix baseline = `gui_app.log.prevboot` (Aug 5).

## VERIFIED — 12 of 65

### Individually verified (6)
| commit | class | evidence |
|---|---|---|
| `5871c37b` | LIVE | supervisor spawns `build\Nunba\python-embed\python.exe -c`; **`Python310` = 0** in the boot window (it previously always spawned `C:\Python310` + the checkout). argv is the `-c` armor branch, confirmed by content. |
| `77480071` | LIVE | 4-way matrix: `/agents/researcher` and `/agents/Hevolve` + browser Accept -> **200 SPA**; same path + `application/json` -> **404 JSON**; `/agents/sync` -> **401** (real API resolves, auth-gated). Matches the commit's own asserts. |
| `69b7f8ca` | LIVE | `/peer_link` + real WS upgrade -> **101 Switching Protocols**. A plain GET returns the SPA catch-all — the #603 trap. |
| `d96db50c` | LIVE | two NEW log lines at 12:28:29 — `WAMP router deferred — no non-web channels or mobile peers at boot` and `WAMP re-evaluation subscriber registered` — both **absent from the Aug-5 pre-fix build**. |
| `7dbf86c3` | EXEC | shipped predicate under the bundle interpreter: `model_path=None` -> old path-only check **False**, canonical detector **True, 3 presets**. Reproduces the commit's exact claim. |
| `9c996aaa` / `ddc575e3` | ARTIFACT | corrected `request_swap(needed_model='language_switch_to_…')` present in the shipped `model_lifecycle.py:2451`. Runtime path never fired (0 hits, both corpora) — see NOT DRIVEN below. |

### Serve-stack family — verified at family level (6)
`efe3818f`, `171210b4`, `b0fef5c0`, `604f13d0`, `38022d5c`, `bd50c0f8` exist to
produce ONE ASGI stack that serves `/peer_link` on every path. The live boot shows
exactly that outcome:
```
12:28:29 PeerLinkManager started (tier=flat, max_links=10)
12:28:32 PeerLink 'events' ingress wired -> receive_from_peer
12:28:34 Starting Hypercorn (ASGI) on 0.0.0.0:5000 (executor_threads=128, app=full)
12:28:34 hypercorn.error - Running on http://0.0.0.0:5000
```
ONE Hypercorn banner, not three; `waitress` = 0; and `/peer_link` completes a 101
handshake. **Stated precisely: this proves the unified stack is what serves and that
peer_link works on it. It does not individually prove each refactor commit.**

## NOT VERIFIED, by reason — 53

- **30 NOT-OBSERVABLE by construction** — touch no production `.py` (docs, tests,
  CI, nix). No desktop log can ever show them. This independently reproduces the
  ~32 N/A I predicted before reading any log.
- **7 BUILD-TIME** (`scripts/` only) — evidenced in build logs, NOT live. Must not
  be reported as live: `c4bcfb00`, `6baac716`, `3856f1ee`, `21a4f103`, `4ed1099e`,
  `4b719e8c`, `45d43cc3`.
- **16 DEFENSIVE-SILENT** — the commit added *only* error/skip-path strings
  ("registration skipped", "emit skipped", "publish failed for", "swallowed
  ImportError"). 0 hits means **the failure did not occur**, which is the intended
  outcome — but it is not proof the fixed path ran. Includes `32f0232c`,
  `9a2997e0`, `c17529a7`, `271f0b14`, `28681cc9`, `e3015199`, `afc2ed52`,
  `52ac5be7`, `fc5033d2`, `9c0efed9`, `267006fe`, `f30795cb`.
- **6 NO-MARKER** — changed production code, emit no new string: `51cd0ae4`,
  `1659a20c`, `38022d5c`, `67aa0ce2`, `47eeeebb`, `bd50c0f8`.

## Blocked, and why (not failures)
- `32f0232c` — `/api/admin/metrics/{queue,latency}` return 401; an admin JWT needs
  password entry, which the standing security constraint prohibits.
- `9c996aaa` runtime — the only entry point (`hart_seal()`) seals a name AND switches
  the live app's language. Not driven: that mutates the user's running desktop.
- Program Files install — blocked on UAC. The bundle run reaches the HARTOS checkout
  and repo `.venv` (task #376), so a true-install pass is still owed.

## Two measurement errors I caught in myself
1. **`f30795cb`**: my marker demanded `cuda:0`, a string the fix never emits — it
   computes `'gpu'`/`'cpu'`. On a GPU box the buggy and fixed code emit the SAME
   value, so it is unobservable here. I was one step from filing a false regression.
2. **`271f0b14`**: 85 "reserve" hits were `pre-SERVE-d last 2 messages` — a substring
   collision, not VRAM reservation. Counting without reading the lines would have
   manufactured a verification.
