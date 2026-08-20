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

---

# Driven-action pass (13:12-13:16) — silence converted to evidence

Drove a real chat turn against the running app and re-measured. 1,247 new log
lines. `POST /chat {"text":...}` -> **HTTP 200 in 4.08s**,
`{"text":"OK","agent_status":"Draft-First Mode","source":"langchain_local"}`.
(First attempt was my own error: the API field is `text`, not `message`.)

## Newly VERIFIED — 51cd0ae4 (total now 13 of 65)
`fix(ui): stop publishing model-facing text to the user's thinking bubble`.
The publisher was demonstrably ALIVE in the same window — 82 `broadcast_sse`,
4 `chat.response`, 3 `chat.pupit`, 8 `publish`. `chat.thinking` = **0**, and the
model-facing text
`Execute Action 3: send_message_to_user: ... ,Latest User message: WHO WE ARE:...`
appears ONLY in internal `STATE_TRANSITION` / `Processing message` lines —
**0 of them reached any publish**. Text present internally, withheld from the
user: exactly the fix.

## EXERCISED-SILENT — 7 commits upgraded from "unknown silence"
After a full boot AND a successful chat turn, every failure/skip string these
commits added is still **0**:

| string (0 occurrences) | commit |
|---|---|
| `Loading model` | 9a2997e0 |
| `Could not import recipe modules` | 267006fe |
| `select_best: swallowed ImportError on llm reserve` | 271f0b14 |
| `channel.registered emit skipped` | e3015199 |
| `Media tools registration skipped` / `News tools registration skipped` | afc2ed52 |
| `Publish tools registration skipped` | fc5033d2 |
| `a dead worker must be replaced` | 28681cc9 |

This is stronger than the earlier passive silence: the surrounding subsystems
provably ran. It is still weaker than a positive marker — it proves the failure
branch did not fire, not that every line of the fix executed.

## NEW LIVE GAP FOUND — 9c0efed9 media route is not reachable
`@social_bp.route('/media/<file_id>/<filename>')` IS in the shipped
`python-embed/.../integrations/social/api.py:1760` (Aug 20 11:58), and
`social_bp` IS registered (`/api/social/feed` -> 401, `/api/social/consent` ->
401). But **every** variant 404s with `API endpoint not found`:
`/api/social/media/1/x.png`, `/abc/def.png`, `/abc/def`, `/1/2`.

So the route ships but is not attached to the app. NOT YET PROVEN why. Leading
hypothesis, untested: the route is declared at line 1760, after `social_bp` has
already been handed to `register_blueprint` — Flask silently ignores routes added
to an already-registered blueprint. That is the same family as task #321 (G1
blueprint registration ordering). Do not treat the mechanism as confirmed.

## Side observation, single sample
The chat turn returned in **4.08s**. Task #385 recorded a 70.9s median for
autogen.create calls. One trivial prompt on a warm process is not a benchmark —
noted, not claimed.

---

# Test + CI pass — 33 of 64 now carry appropriate evidence

## Tests: 220 passed, 0 failed
All 16 test files these commits touched were run:
- 7 Nunba files -> **76 passed** in 6.2s
- 9 HARTOS files -> **144 passed** in 65s

19 of 64 commits touch one of those files, so their test-class claim is verified
in the terms appropriate to it.

## Union across every verification method
| method | commits |
|---|---|
| live (running app: log / HTTP / WS) | 5871c37b, 77480071, 69b7f8ca, d96db50c, 51cd0ae4 |
| executed shipped code | 7dbf86c3 |
| shipped-artifact present | 9c996aaa, ddc575e3 |
| serve-stack behavior (family) | efe3818f, 171210b4, b0fef5c0, 604f13d0, 38022d5c, bd50c0f8 |
| green test just run | 19 commits (overlaps above) |
| **STRONG union** | **26** |
| + exercised-silent (subsystem ran, failure branch did not fire) | +7 |
| **= some appropriate evidence** | **33 of 64** |

Remaining 31 are docs/CI/nix.

## CI IS NOT GREEN — a real failure, with root cause
Correction to task #633: a real GitHub CLI DOES exist at
`C:\Program Files\GitHub CLI\gh.exe`; it is simply not first on PATH (the conda
`gh` shadows it). So CI *is* queryable from this box.

HEAD `2029a7bd`: Deploy ✅, Security Scan ✅, Docker ✅, **Nix Lint & Evaluate ❌**.
Inside it: Structural Tests ✅, Lint (statix+deadnix) ✅, **Nix Flake Check ❌**.

```
eval FAILED (rc=1): packages.x86_64-linux.sd-desktop-arm.drvPath
error: The option `hardware.graphics.enable32Bit' has conflicting definitions
eval FAILED (rc=1): packages.x86_64-linux.sd-phone.drvPath
```

ROOT CAUSE (source-visible, four definitions):
| file:line | value | priority |
|---|---|---|
| `nixos/modules/hart-kernel.nix:346` | `lib.mkDefault ...isx86_64` | mkDefault — yields |
| `nixos/modules/hart-subsystems.nix:492` | `...isx86_64` | normal |
| `nixos/modules/hart-nvidia.nix:98` | `true` | normal |
| `nixos/configurations/desktop.nix:207` | `true` | normal |

On the ARM targets `isx86_64` is **false**, so `hart-subsystems` asserts `false`
while `hart-nvidia`/`desktop` assert `true` — two NORMAL-priority definitions,
which is precisely the "conflicting definitions" eval error. `hart-kernel` is
already `mkDefault` and so is not part of the conflict.

NOT FIXED HERE, deliberately: the repair is a priority change (`mkDefault` /
`mkForce`) in a Nix module, and there is no nix on this Windows box, so I cannot
run `nix flake check` to confirm a fix. Shipping an unverified nix edit would
violate the standing rule against claiming a fix without verification. Needs a
nix-capable environment or a CI round-trip.

---

# ROOT CAUSE, PROVEN: a Feb-2026 HARTOS shadow in user site-packages

The `9c0efed9` 404 is not a blueprint-ordering bug. `C:\Users\sathi\AppData\
Roaming\Python\Python312\site-packages` holds a **2026-02-14 copy of HARTOS**
that sits AHEAD of the bundle on `sys.path`.

## The decisive measurement
Same interpreter, same import, one env var:

| user-site | `integrations.social.api` loads from | media rule | total Flask rules |
|---|---|---|---|
| enabled (default) | `AppData\Roaming\...\site-packages` (Feb 14, 72,476 B) | **absent** | **109** |
| `PYTHONNOUSERSITE=1` | `build\Nunba\python-embed\...` (Aug 20, 182,808 B) | **present** | **167** |

The live app serves neither -> the live app is running the Feb-14 shadow.
That is **58 missing endpoints**, not one route.

## Blast radius
| package | shadow (Feb 2026) | bundle (Aug 20) | shipped files being shadowed |
|---|---|---|---|
| `integrations` | 201 | 565 | 201 |
| `core` | 7 | 98 | 7 |
| `security` | 18 | 33 | 18 |

**226 modules** resolve to six-month-old code. Modules NOT in the shadow fall
through to the bundle — which is why the picture looked mixed:

| module | in shadow | who wins |
|---|---|---|
| `integrations/agent_engine/hevolveai_supervisor.py` | no | bundle (so 5871c37b's verification STANDS) |
| `integrations/service_tools/model_lifecycle.py` | no | bundle (so 9c996aaa's artifact claim STANDS) |
| `integrations/social/api.py` | **yes** | shadow -> the 404 |
| `integrations/channels/media/files.py` | **yes** | shadow -> other half of 9c0efed9 |

`9c0efed9` touched exactly the two files that are shadowed. Nothing about that
commit is wrong; it cannot reach the running app.

## Why app.py's guard does not stop it
app.py already tries: `:180 os.environ.setdefault('PYTHONNOUSERSITE','1')`,
`:582` the same, and `:634 site.ENABLE_USER_SITE = False` whose own comment says
it exists to stop `site.addsitedir()` re-adding user site-packages.

`ENABLE_USER_SITE = False` set AFTER interpreter startup cannot remove paths
`site.py` already appended during startup, and `PYTHONNOUSERSITE` in `os.environ`
only reaches CHILD processes — the parent's `sys.path` was built before app.py
ran. So the guard protects subprocesses (whisper, hevolveai — both confirmed
clean) while the main process keeps the shadow. A guard that cannot fail for the
defect it names: `memory/feedback_vacuous_guards.md`.

## Same family as prior art
#602 (partial ctranslate2), #609 (torn numpy), #610 (dead torch) — all
`~/.nunba` shadowing the bundle. This is the same failure at a different
prefix, and it is the largest one yet: 226 modules.

## NOT FIXED HERE
The repair is to actively REMOVE user-site entries from `sys.path` at startup
rather than only setting a flag. That edits app.py's frozen boot path and can
only be proven by a rebuild + reboot (~44 min). Recording it fully rather than
shipping an unverified change to the boot path.
