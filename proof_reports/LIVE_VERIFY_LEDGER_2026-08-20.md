# Live-verification ledger — 2 days of fixes (Nunba + HARTOS)

**Goal:** verify all fixes from 2026-08-18..20 LIVE.
**Evidence standard (set by the user, 2026-08-20):** live verification comes
from the **latest built + installed Nunba on THIS machine**, evidenced from
`~/Documents/Nunba/logs/`. Nothing else counts as "live".

**Scope, counted not remembered:** 17 Nunba commits + 55 HARTOS commits = **72**.

---

## STATUS: 0 of 72 live-verified. The live lane has not started.

The build is still running. Nothing has been installed. The app has not been
launched under the new build. Any "verified" claim right now would be false.

---

## Criticism seeded — the traps that would make me exit early and be wrong

### C1. Evidence-class substitution (I already did this today)
CI green, unit tests passing, and driving the bundle's interpreter directly
are **not** the stated standard. Today I reported "99/99 hevolveai modules
via ArmoredLoader" — real and useful, but I ran that myself against
`python-embed/python.exe`. That is **not the installed app running**. Under
the stated bar it is NOT live-verified. Do not carry it into the final
report as if it were.

### C2. Repo mode makes the hevolveai evidence describe the WRONG TREE
`hevolveai_supervisor._build_cmd()` returns early:

    if _repo_root is not None and _repo_python is not None:
        return [_repo_py, str(_repo_root / 'run_server.py')]

Both exist on this box (`C:\Python310\python.exe`,
`~/PycharmProjects/hevolveai/run_server.py`). So after install, healthy
`hevolveai:` lines in `gui_app.log` describe **the checkout**, never the
bundle. Reading those and declaring the bundle verified is exactly the
"measured the wrong tree" error. **The repo-mode fix must land and ship
BEFORE any hevolveai claim from installed logs is meaningful on this box.**

### C3. Not every commit is log-observable — say so, do not fabricate
Of the 72: 11 are `docs`, 5 `refactor`, 3 `diag`, 1 `Revert`, plus `nix`/`ci`
commits that never touch the desktop runtime. These leave **no trace** in
`~/Documents/Nunba/logs/`. Marking them "live-verified" would be invention.
They must be reported in a separate class with their real evidence, or
declared NOT live-verifiable. A number like "72/72 verified" is a lie by
construction.

### C4. Absence of a string is not proof of a fix
Many fixes are "stop emitting X" (9a2997e0 stop showing "Loading model";
51cd0ae4 stop publishing model-facing text to the thinking bubble; 32f0232c
stop fake success). Their absence in a fresh log proves nothing on its own —
a quiet log and a dead feature look identical.
**Required method: before/after over a comparable window.** Pre-fix logs
exist (`gui_app.log.1`..`.5`, `api_server_20260818..19`), so the string must
be shown PRESENT pre-fix and ABSENT post-fix over similar activity. Anything
less is a vacuous guard.

### C5. The install must actually be the new build
Prior burn (#592): a measurement was taken against a browser-cached stale
bundle, and both "defects" described code that no longer shipped.
**Step 0 of the live lane:** assert the installed `Nunba.exe` / bundle
timestamp+hash matches what this build just produced, before reading a
single log line.

### C6. "The app started" is not "the fix works"
Boot success proves boot. Each fix needs its own named marker. A per-commit
marker table must exist BEFORE reading logs, or I will pattern-match
whatever I find into a success story.

### C7. Known-red things must stay red in the report
- Nunba `Code Quality & Security`: **failing**, and failing since at least
  08-16 (`f4b7e402`, `7f06c334`) — i.e. PRE-DATES this window. Not caused by
  these 72, and not fixed by them either. Report as pre-existing-red.
- HARTOS `Flake Checks (release gate)`: python shards 3/4/6 of 8 **fail**.
  Named so far:
  - `test_session_2026_05_10_changes.py::TestEventBusSSEDenylist::test_default_denylist_holds_only_the_internal_bus_prefix`
    — `assert ('bus.','channel.') == ('bus.',)` → the denylist gained
    `'channel.'`. **Suspect: e3015199 `feat(channels): emit channel.registered`**
    (in this 2-day window) — a real candidate regression from our own work.
  - `test_file_manager.py::TestFileManager::test_upload_basic`
    — `assert '/files/' in 'https://azurekong.hertzai.com/api/social/media/...'`
    **Suspect: 9c0efed9 `fix(media): uploaded files were written to disk and
    served by nothing`** — also in this window.
  - `test_secret_redactor_integration.py::TestGDPREndpoints::test_gdpr_export_requires_auth`
    — `sqlite3.DatabaseError: another row available` (looks like test
    pollution, not necessarily ours).
  These are NOT "pre-existing noise" by default — two of the three point at
  commits inside this very window and must be run down, not waved past.

### C8. The compositor Revert is a fix that UNDID a fix
`1f602131` reverts `f27d82fc` ("orb hover froze the box"), and `316493fa`
says plainly the frame-timestamp fix was NOT the freeze fix. So the freeze
is **still open**. Any summary that counts f27d82fc/79391a65 as "fixed"
without noting the revert is misreporting.

---

## Exit criteria — the goal is NOT met until ALL hold

1. Build completes with `REAL_EXIT=0` (read from the log, not the shell).
2. Installer produced, installed, and the installed bundle's identity
   asserted to match this build (C5).
3. Nunba launched; `~/Documents/Nunba/logs/` shows a fresh boot after the
   install timestamp.
4. A per-commit marker table exists (C6), each row citing a concrete log
   string or an explicit "not log-observable" with its real evidence class.
5. Before/after evidence for every "stop emitting X" fix (C4).
6. C7's three named HARTOS test failures each attributed: ours or not.
7. Repo-mode decision resolved (C2) before any hevolveai claim from logs.
8. Final report states counts honestly, split by evidence class — never a
   bare "all verified".

## Anti-premature-exit rule
If any exit criterion above is unmet, the correct report is
"NOT verified, here is exactly what remains" — not a summary of what went
well. Partial success reported as success is the failure mode this ledger
exists to prevent.

---

## Progress log — 2026-08-20

### C7 attribution: 2 of 3 HARTOS failures were OURS, both now fixed
| Test | Cause | Verdict | Fix |
|---|---|---|---|
| `TestEventBusSSEDenylist::test_default_denylist...` | **e3015199 (ours)** — blame puts `_SSE_DENYLIST_PREFIXES` on that commit | code RIGHT, test STALE | `b793001b` — 3 passed locally |
| `test_file_manager::test_upload_basic` | **9c0efed9 (ours)** — moved uploads off the dead `/files/` route | code RIGHT, test STALE | `58819360` — NOT run locally, see below |
| `test_secret_redactor_integration::test_gdpr_export_requires_auth` | `sqlite3.DatabaseError: another row available` | UNATTRIBUTED — looks like cross-test DB pollution | not investigated yet |

Both of ours were the SAME shape: working code, stale test pinning the old
behaviour. In both cases the tempting move was to change the code back.
Standing rule now: **working code + stale test => fix the test.** Narrowing
or reverting live code to satisfy an old assertion is how regressions get
reintroduced.

### Environment defect found (blocks local test verification)
NEITHER interpreter on this box can run HARTOS async tests:
  * Nunba `.venv` — no `pytest-asyncio`; async tests error at COLLECTION
    ("async def functions are not natively supported"), which reads as a
    test failure but is a runner failure. This produced one false "still
    red" reading before it was caught.
  * HARTOS `venv/` — mixed stdlib; `shutil` from C:\Python312 raises
    `AttributeError: module 'os' has no attribute '_walk_symlinks_as_files'`.
Consequence: `58819360` is reasoned against the exact URL CI emitted, NOT
executed. CI is the confirming run. Recorded rather than glossed.

### Build-level evidence (NOT the live standard, logged as its own class)
From `proof_reports/build_20260820_run2.log`:
  * `Installed from ...\HARTOS` — step 7b cleared the 120s cap => `c4bcfb00`
    works at build level.
  * `PASS: hart-backend import: hart-backend OK` — `3856f1ee`'s canary now
    genuinely executes and passes; before it imported a module that never
    existed and could not pass.
  * python-embed atomic swap happened; cx_Freeze `build_exe` running.
This is BUILD evidence. It does NOT satisfy the live standard
(installed app + ~/Documents/Nunba/logs). Still 0 of 72 live-verified.

### FINDING — the "Failed: 2" is INTERMITTENT and comes from .venv leaking into the frozen validate
Yesterday I closed this as "environmental drift". That was wrong, and the
log now says why precisely.

`POST-BUILD: Running Nunba.exe --validate` (line 28596) runs 22 times:
  * 20 runs -> `Passed: 62, Failed: 0, Warnings: 0`
  * 2 runs  -> `Passed: 62, Failed: 2, Warnings: 2`  (lines 30884, 31061)
  * returns to Failed: 0 immediately after (31162, 31257, 31352)
So it is INTERMITTENT -- 2 of 22 -- which is exactly why a one-shot
"it passed / it failed" reading kept flip-flopping.

The two failures:
  1. `hart_intelligence  TypeError: 'NoneType' object is not subscriptable`
     chain: transformers `_is_package_available("torch")`
       -> importlib.metadata.version("torch")
       -> importlib_metadata Distribution.version -> md_none(self.metadata)['Version']
       -> self.metadata is None.
  2. `autogen  (torch from python-embed: AttributeError: partially
     initialized module 'torch' has no attribute 'autograd' -- circular import)`

MECHANISM: the traceback frames are `.venv\Lib\site-packages\...` INSIDE a
FROZEN `Nunba.exe --validate` run. The frozen exe is resolving imports from
the DEVELOPER venv because validate runs with the repo as CWD, so BOTH
`.venv` torch 2.10.0 and `python-embed` torch 2.10.0+cpu are importable in
the same process. Two torch distributions -> metadata resolution can land on
one with no readable METADATA, and autogen can catch torch half-initialised.
Same family as #376 (`_isolate_frozen_imports` stripping the bundle's own
lib/ when built under PycharmProjects).

WHY IT LOOKED LIKE DRIFT: deleting python-embed left exactly ONE torch, so
the collision could not happen and the build passed. Rebuilding python-embed
restored the second torch and the intermittency came back. The delete
"fixed" it by removing one side of a race, not by clearing stale state.

NOT YET ESTABLISHED (do not claim):
  * whether this is fatal to THIS build -- it was still running when found.
  * whether an INSTALLED app is affected. It probably is not: Program Files
    has no adjacent `.venv`. That is a hypothesis, not a measurement.
  * standalone repro FAILED to reproduce -- `torch version = 2.10.0`
    resolves fine outside the validate context, which is itself evidence
    that the trigger is the mixed sys.path, not a torn dist-info. All four
    torch dist-infos on this box have METADATA present (checked, not assumed).

### BUILD GAP — a HARTOS source change does not reach the bundle on a normal rebuild
`scripts/build.py` Gate A rebuilds python-embed only when the EMBED_DEPS hash
changes; otherwise it prints "python-embed exists and hash matches" and skips
`rebuild_python_embed.py` entirely. Gate B only tops up MISSING EMBED_DEPS
packages. `hart-backend` is in NEITHER path -- it is installed from source at
step 7b INSIDE the rebuild.

Consequence: edit HARTOS, run `python scripts/build.py`, and unless the
EMBED_DEPS hash happens to have changed, the installer ships the PREVIOUS
hart-backend. Silently. No warning.

NOT a problem for today's build, measured not assumed:
  python-embed/.../integrations/agent_engine/hevolveai_supervisor.py
  mtime 2026-08-20 11:18  -> refreshed by today's full rebuild (the
  sounddevice hash change forced it), so HARTOS through afc2ed52 IS bundled.
It IS a problem for the repo-mode fix (5871c37b, committed after 11:18): the
bundle still carries the ungated
  `    candidates.append(Path.home() / 'PycharmProjects' / 'hevolveai')`
so the fix would NOT ship on a plain rebuild.

Handling now: refresh hart-backend into python-embed with the same command
step 7b uses, AFTER the in-flight build stops copying python-embed into
build/Nunba (touching it mid-copy would corrupt the bundle).
Longer-term this deserves a real fix in build.py -- a HARTOS content check
that forces the 7b reinstall -- but that is new build logic, not today's
scope, and is recorded here rather than done silently.

---

## Criticism, iteration 2 — new failure modes since the last pass

### C9. I declared a fix DEAD from a single number (and was wrong)
I reported "the 59 MB log exclusion did NOT ship, fix #2 is ineffective" on the
basis of ONE datum: the installer was 472.7 MB instead of ~53 MB smaller. Then
I guessed a mechanism (pip package-data) and that was wrong too. The actual
measurements:

    python-embed/.../hevolveai/server/logs        0   <- the fix WORKS here
    hevolveai repo src/.../server/logs           79
    .venv, build/Nunba/lib                        0
    build/Nunba/python-embed/...                 79   (mtimes 2025-10..2026-06)
    hevolveai dist-info RECORD, log entries       0   <- pip did NOT install them

`_pip_install_sibling` copytrees to a temp dir WITH ignore=_IGNORE_HEAVY and
pip-installs THAT, which is why the embed is clean. The post-build copy
(setup_freeze_nunba.py:2315) uses ignore=_ignore_unloadable (the ABI prune) and
dirs_exist_ok=True -- which never deletes pre-existing destination files. A
source holding 0 logs cannot PRODUCE 79, so those are stale carry-over in
build/Nunba.

RULE: a size delta is a HINT, never a verdict. Measure the trees on both sides
before pronouncing on a fix. One number + a big claim is the narrow-window
failure, and I did it twice in five minutes.

STILL OPEN (run3 decides, do NOT assume either way): whether build/Nunba is
genuinely wiped per run. run2 logged "Removed previous build/Nunba/ entirely",
which is INCONSISTENT with 79 stale files surviving. Either the wipe does not
cover python-embed, or the files arrive by a path I have not found. Both are
real defects; guessing which is not verification.

### C10. NEW RISK, AND IT IS MINE: repo mode now OFF means this box runs the bundle for the first time
5871c37b makes the installed app take the else-branch: armor hook -> compiled
import -> uvicorn, spawned under python-embed. Until now THIS BOX always ran
C:\Python310 + the checkout. So the next install is the first time the bundle
path executes here in anger.

If hevolveai fails to boot from the bundle, that is a regression I introduced,
not a pre-existing condition. Watch for, in ~/Documents/Nunba/logs/gui_app.log:
  * "hevolveai supervisor skipped: <reason>"   -> supervisor_should_run() false
  * "hevolveai subprocess init failed: <e>"    -> spawn raised
  * absence of "hevolveai supervisor started: port=... job_object_bound=..."
  * absence of the 08-19 baseline markers: TopologicalConceptGraph,
    [path=QWEN_PATH], Thread-4 (_async_learning_loop), child CPU cap
A quiet log here is NOT success -- it is the signature of a brain that never
started. Compare against the 08-19 19:17 baseline, not against zero.

### C11. The marker table is still not built, and it is the biggest premature-exit risk left
Exit criterion 4 remains unmet. Once an install boots healthy there will be a
strong pull to read a clean gui_app.log and call many of the 72 verified. Without
a per-commit marker written BEFORE reading, that is pattern-matching, not
verification. Build the table first; read logs second. In that order.

### UNRESOLVED — the 79 hevolveai logs: ingress NOT found (3 theories killed)
Run3 settles the wipe question and kills my stale-carry-over theory:
  run3 log: "[INFO] Removed previous build/Nunba/ entirely"
  build/Nunba/.../hevolveai/server/logs -> 79 files, AFTER that wipe
So they are copied FRESH every build. Not leftovers.

Eliminated by measurement, not argument:
  source python-embed/.../hevolveai/server/logs  -> DIR ABSENT (my fix works)
  .venv/.../hevolveai/server/logs                -> 0
  .venv hevolveai RECORD, log entries            -> 0  (pip did not install)
  python-embed hevolveai RECORD, log entries     -> 0
  build/Nunba/lib/hevolveai/server/logs          -> 0
  the ignore pattern IS present (setup_freeze_nunba.py:1859) and a live test
  of the real callable against the real dir returns exactly {'logs'}

Only tree on the box holding 79: the hevolveai REPO src/hevolveai/server/logs.
So SOMETHING copies the repo tree into
build/Nunba/python-embed/Lib/site-packages/hevolveai without passing
_IGNORE_HEAVY -- and I have not found which step. mtimes on the shipped copies
are the repo originals (2025-10..2026-06), consistent with copy2 preservation.

THREE OF MY THEORIES WERE WRONG IN SEQUENCE:
  1. "fix #2 is ineffective"        -> wrong, embed is clean
  2. "pip package-data is the path" -> wrong, RECORD has 0 entries
  3. "stale carry-over"             -> wrong, survives a full wipe
Recording as OPEN rather than guessing a fourth. Impact is 59 MB of dead bytes
in the installer -- a size defect, not a correctness one. It does NOT block the
live-verification goal and must not keep consuming it.
