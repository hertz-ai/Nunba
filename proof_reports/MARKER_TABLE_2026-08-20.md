# Per-commit marker table — written BEFORE reading any installed log

Purpose (ledger C6/C11): decide what would COUNT as evidence for each commit
*before* looking, so a healthy `gui_app.log` cannot be pattern-matched into
success. A commit with no marker here is NOT verifiable from logs and must be
reported in its own class.

Scope: 17 Nunba + 55 HARTOS = 72 commits, 2026-08-18..20.
Evidence root: `~/Documents/Nunba/logs/` on the installed build.
Baseline for before/after: `gui_app.log.1`..`.5`, `api_server_20260818..19`.

Legend
  LOG   — expected to leave a string in the installed logs; marker given
  ABS   — "stop emitting X" fix; needs PRESENT-before / ABSENT-after over a
          comparable window (a quiet log alone proves nothing)
  BUILD — build-time only; already evidenced in build logs, NOT live
  N/A   — docs/nix/CI/test-only; leaves no desktop-runtime trace. Reporting
          these as "live-verified" would be invention.
  ???   — I cannot justify a marker without reading more code. Left blank
          DELIBERATELY rather than invented.

---

## Nunba (17)

| commit | class | marker / evidence |
|---|---|---|
| c4bcfb00 source-install timeouts | BUILD | run3 `REAL_EXIT=0`; step 7b `Installed from ...\HARTOS` — DONE |
| 6baac716 sounddevice + logs | BUILD | `sounddevice.py` in shipped embed — DONE. Log-exclusion: embed clean, shipped tree still 79 — OPEN |
| 3856f1ee hart-backend canary | BUILD | `PASS: hart-backend import: hart-backend OK` — DONE |
| 21a4f103 temp-sweep age guard | BUILD | `swept N stale hart-freeze-pkg-* dir(s)` in build log |
| 4ed1099e temp-dir leak | BUILD | same sweep line; + no `hart-freeze-pkg-*` left in %TEMP% |
| 4b719e8c ABI warn | BUILD | `WARNING: N module(s) have NO cp312 build` (0 expected now) |
| 45d43cc3 wrong-ABI prune | BUILD | shipped hevolveai: 149 cp312 / 0 cp310 — measured earlier |
| 77480071 /agents/<slug> SPA | LOG | request for `/agents/<name>` returns SPA not JSON 404. Needs a driven request — NOT passive |
| bd50c0f8 core.serve both entries | LOG | one hypercorn/serve banner at boot, not two stacks |
| 69b7f8ca peer_link on both paths | LOG | `/peer_link` websocket listener mounted line at boot |
| d96db50c wamp one authority | LOG | single "router needed" decision per boot; no flapping |
| ae638c72 seven agents/avatars | ??? | UI-surface; likely not in gui_app.log — needs UI check |
| 47eeeebb docs(wamp) | N/A | docs only |
| 7dbf86c3 AI-setup gate | LOG | setup gate must NOT say "no model" while models exist |
| f30795cb catalog device | LOG | device string is real (`cuda:0`/`cpu`), never literal `'gpu'` |
| 1659a20c installer partial download | ??? | needs a partial-download scenario; not passive |
| a04545b3 ci(build) | N/A | CI workflow only |

## HARTOS (55) — grouped

### Runtime, log-observable
| commit | class | marker |
|---|---|---|
| 271f0b14 vram reserve primary LLM | LOG | reservation line before STT/TTS/VLM load; primary not evicted |
| 9a2997e0 stop showing "Loading model" | ABS | `"Loading model"` PRESENT in pre-fix logs, ABSENT after |
| 51cd0ae4 model-facing text off thinking bubble | ABS | model-facing prefix strings absent from `chat.thinking` payloads |
| 32f0232c stop fake success / invented telemetry | ABS | `/metrics/queue`,`/metrics/latency` no longer emit constants |
| 267006fe log recipe-import failure | LOG | an actual ERROR line on recipe import failure (was print() to void) |
| 9c996aaa draft eviction on non-Latin switch | LOG | eviction line when language flips to a non-Latin script |
| c17529a7 image_gen fabricated success | ABS | no success emit without a produced artifact |
| 9c0efed9 media served by nothing | LOG | upload URL is `/api/social/media/<id>/<name>` |
| 5a682bd0 channel attribution persistence | LOG | attribution written outside the container path |
| e3015199 channel.registered emit | LOG | `channel.registered` on non-web adapter registration |
| 28681cc9 start() orphan worker thread | LOG | no duplicate/orphaned worker thread at boot |
| b281ea85 `nunba` on PATH | LOG | AppRegistry registers `nunba` without a PATH error |
| 36540513 destroy boot-splash Lottie | ??? | frontend teardown; may not reach gui_app.log |
| 8c229154 / d96db50c WAMP wake via EventBus | LOG | one predicate, one actuator; wake line on channel event |
| 5871c37b repo mode dev-only (NEW) | LOG | **`hevolveai supervisor started: port=… job_object_bound=…`** AND the child argv must be python-embed, NOT `C:\Python310`. See C10. |

### Serve / deps (log-observable at boot)
| efe3818f, 171210b4, b0fef5c0, 604f13d0, 38022d5c | LOG | one ASGI stack at boot; `/peer_link` reachable; hypercorn (not waitress) |
| 0a5c70f3 autobahn pin | BUILD | install-time; no ImportError for autobahn at boot |

### Compositor — REPORT AS OPEN, NOT FIXED
| 79391a65 frame callbacks time=0 | — | **superseded**: `316493fa` states the frame-timestamp fix was NOT the freeze fix |
| f27d82fc orb hover froze the box | — | **REVERTED by 1f602131** — the freeze is still open |
| 541e53f8, c59396b7 beacons | LOG | beacon lines present; they are diagnostics, not fixes |
| 8b3b1282 publish hart-comp binary | N/A | CI artifact |

### nix / CI (12) — verified by CI, not by desktop logs
b6286d0d, 89193563, a5193acb, 0290042f, 04f5a54b, cc0eb60f, 648a5025,
fc9163ef, 8b3b1282, a04545b3(N), plus flake gate
| class | N/A for logs | evidence = `Flake Checks` job. Compositor cargo test + nix build already GREEN; the 3 python-shard failures are separately attributed (2 ours, fixed; 1 open) |

### docs (11) + refactor (5) + diag (3) + Revert (1)
| class | N/A | 316493fa, 6a09525b, 0f82d727, 1d7fc053, 67aa0ce2, 2c1fe8dd, 416f8b95,
f218d2a7, 4719d218, 6d502e41, 47eeeebb(Nunba) — content-accuracy only.
refactor: efe3818f, d23ea3e5, ee5bf69c, 4b39e2d5, bd50c0f8(Nunba).
diag: 541e53f8, c59396b7, 648a5025. Revert: 1f602131. |

### feat (4) — need a driven action, not a passive boot
afc2ed52 (media/news → chat runtime), 52ac5be7 (human half of gate),
fc5033d2 (LLM reaches publishing, still cannot publish), e3015199.
These need an actual channel/publish attempt to produce evidence. A clean boot
says nothing about them.

---

## Honest count, decided in advance
- LOG-observable from a passive boot: **~20**
- ABS (need before/after): **4**
- BUILD-only: **7** (already evidenced, NOT live)
- N/A (docs/nix/CI/refactor/diag/revert): **~32**
- Need a driven action (feat/UI/deep-link/installer): **~7**
- ??? marker unknown: **3**

**So the maximum honestly claimable from a passive installed-boot log read is
about 20 of 72 — not 72.** Any report implying otherwise is false by
construction. This number is fixed HERE, before looking at any log.
