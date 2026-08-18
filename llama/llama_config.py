"""
llama_config.py - Configuration and management for Llama.cpp server

Provides configuration management, server lifecycle, and API interface
for the Llama.cpp local AI server.

Historical note:
  _compute_budget and select_best_model_for_hardware were DELETED from
  LlamaConfig. Model selection is now the orchestrator's job
  (models.orchestrator.get_orchestrator().select_best).  Both the
  method deletion AND this comment are enforced by
  tests/test_llama_config.py::TestComputeBudgetMethodsDeleted — if you
  re-introduce either symbol here, that test will fail.
"""
import json
import logging
import os
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

import requests

from llama.llama_installer import MODEL_PRESETS, LlamaInstaller, ModelPreset

logger = logging.getLogger('NunbaLlamaConfig')


# Task #652 — thinking MUST be off for every local llama-server.
#
# ``--reasoning-budget 0`` below already DECLARES that intent, but on
# llama.cpp build 10330 (687e77892) it no longer ACHIEVES it: that flag is
# implemented by injecting an end-of-thinking tag (hence its sibling
# ``--reasoning-budget-message``), not by setting ``enable_thinking=false``
# in the chat template.  Meanwhile ``--reasoning-format deepseek`` keeps
# working and moves the thoughts into ``message.reasoning_content``.  The
# combination is the worst case: the model thinks anyway AND the thinking is
# routed OUT of ``message.content``, so ``content`` comes back EMPTY.
#
# Measured 2026-08-12 on :8080/GPU by replaying real recorded bodies: 8/8
# draft-classifier calls returned content_len=0 with reasoning_len 1817-2223,
# and the live app logged reply_len=0 / confidence=0.0 / every classifier flag
# null on 45/45 turns.  With this env var set: content_len 538-2338,
# reasoning_len 0, and the app's own draft-telemetry went to reply_len=52,
# confidence=0.95, delegate='none', is_casual=true.
#
# WHY AN ENV VAR AND NOT A CLI FLAG (load-bearing, do not "simplify"):
# llama-server flags are coupled to the binary version and are NOT backward
# compatible — an UNKNOWN CLI FLAG MAKES llama-server EXIT, which would turn
# a thinking bug into a total LLM outage on any box with a different
# llama.cpp build.  An unknown ENV VAR is simply ignored.  ``--help`` on this
# build documents the pairing itself:
#   --chat-template-kwargs STRING  ... (env: LLAMA_ARG_CHAT_TEMPLATE_KWARGS)
# so this is the same parameter, reached by the version-safe spelling.
# Precedent in this file: HEVOLVE_LLAMA_MTP_N exists because the guessed flag
# ``--mtp-n`` did not exist in the local binary.
#
# ONE authority for both spawn sites (main server + caption/draft server) so
# the two can never drift on whether thinking is suppressed.
_LLAMA_THINK_OFF_ENV = 'LLAMA_ARG_CHAT_TEMPLATE_KWARGS'
_LLAMA_THINK_OFF_VALUE = '{"enable_thinking":false}'


def llama_child_env(base: dict | None = None) -> dict:
    """Environment for a spawned llama-server: inherited env + thinking off.

    Pure dict construction — no I/O, no mutation of ``os.environ`` (which
    would leak the setting to every unrelated child of this process).
    An operator who has deliberately set the variable wins; we never
    override an explicit choice.
    """
    env = dict(base) if base is not None else os.environ.copy()
    env.setdefault(_LLAMA_THINK_OFF_ENV, _LLAMA_THINK_OFF_VALUE)
    return env


# PERF-2 (audit #564): Nunba's raw log writers append unbounded — the
# llama-server stdout/stderr log reached ~68MB.  ONE canonical rotation point
# for Nunba raw log writers (no parallel rotation impl): rename → .old past the
# cap, one backup generation.  We KEEP the llama log verbose — its slot /
# "context size exceeded" lines are load-bearing diagnostics — and only BOUND
# it.  Cap via HEVOLVE_RAW_LOG_MAX_MB (default 20).
def _rotate_log_if_oversized(path: str, max_bytes: int | None = None) -> bool:
    """Rename ``path`` → ``path + '.old'`` when it exceeds ``max_bytes``.

    Best-effort, never raises; one backup generation (prior .old overwritten).
    Returns True iff a rotation happened.  Sole rotation impl for Nunba's raw
    log writers — callers must not re-implement it (DRY / no parallel path)."""
    if max_bytes is None:
        try:
            max_bytes = max(1, int(os.environ.get('HEVOLVE_RAW_LOG_MAX_MB', '') or 20)) * 1024 * 1024
        except ValueError:
            max_bytes = 20 * 1024 * 1024
    try:
        if os.path.getsize(path) <= max_bytes:
            return False
    except OSError:
        return False  # missing / unstatable → nothing to rotate
    try:
        os.replace(path, path + '.old')
        return True
    except OSError:
        return False


class ServerType:
    """Enum for server type detection"""
    NOT_RUNNING = "not_running"
    NUNBA_MANAGED = "nunba_managed"
    EXTERNAL_LLAMA = "external_llama"
    OTHER_SERVICE = "other_service"


# Common LLM endpoints to scan
KNOWN_LLM_ENDPOINTS = [
    {"name": "Ollama", "base_url": "http://localhost:11434",
     "health": "/api/tags", "completions": "/api/generate", "type": "ollama"},
    {"name": "LM Studio", "base_url": "http://localhost:1234",
     "health": "/v1/models", "completions": "/v1/completions", "type": "openai"},
    {"name": "LocalAI", "base_url": "http://localhost:8080",
     "health": "/v1/models", "completions": "/v1/completions", "type": "openai"},
    # Port 5000 excluded — Nunba's own Flask runs there
    {"name": "Text Generation WebUI", "base_url": "http://localhost:7860",
     "health": "/v1/models", "completions": "/v1/completions", "type": "openai"},
    {"name": "vLLM", "base_url": "http://localhost:8000",
     "health": "/v1/models", "completions": "/v1/completions", "type": "openai"},
    {"name": "KoboldCpp", "base_url": "http://localhost:5001",
     "health": "/api/v1/model", "completions": "/api/v1/generate", "type": "kobold"},
    {"name": "Jan", "base_url": "http://localhost:1337",
     "health": "/v1/models", "completions": "/v1/chat/completions", "type": "openai"},
]


def _scan_via_canonical_resolver() -> dict | None:
    """First-priority scan: ask HARTOS's canonical LLM URL resolver.

    ``core.port_registry.get_local_llm_url()`` walks 7 candidate
    sources (env vars, ``~/.nunba/llama_config.json:server_port``,
    ``external_llm_endpoint.base_url``, port-registry default, …) and
    probes each.  If a Nunba-managed llama-server is running on a
    non-default port (e.g. 8082), the legacy KNOWN_LLM_ENDPOINTS list
    misses it but this resolver finds it.  Routing through
    ``core.health_probe.probe_llm`` keeps a SINGLE source of truth —
    no parallel "is the LLM up?" implementations (Gate 4 / DRY).

    Returns the legacy shape that ``scan_existing_llm_endpoints``
    callers expect, or None when the resolver can't reach anything.
    """
    try:
        from core.health_probe import probe_llm
    except ImportError:
        return None
    info = probe_llm()
    if info.get('status') != 'up':
        return None
    url = info.get('url') or ''
    if not url:
        return None
    base = url.rstrip('/').rstrip('/v1').rstrip('/')
    models = info.get('models') or []
    name = models[0] if models else 'llama.cpp (canonical resolver)'
    logger.info(
        f"Canonical LLM resolver found running server at {base} "
        f"(model={name}) — reusing instead of starting a new one")
    return {
        "name": name,
        "base_url": base,
        "completions": base + "/v1/chat/completions",
        "type": "openai",
    }


def _openai_models_or_none(response) -> list | None:
    """Return the model list from a genuine OpenAI ``/v1/models`` 200
    response, else ``None``.

    A real llama.cpp / LM Studio / vLLM server answers HTTP 200 with a
    JSON body ``{"data": [ ...models... ]}`` (a non-empty list).  An
    HTML/SPA catch-all — the app's OWN Flask (5000/6777) or a dead
    :8080 — ALSO returns 200 for ``/v1/models``, so status alone is not
    enough.  Single validator shared by both ``scan_existing_llm_endpoints``
    and ``scan_openai_compatible_ports`` (Gate 4 / DRY: one gate, no
    parallel "is this a real LLM 200?" implementations).
    """
    if response.status_code != 200:
        return None
    try:
        payload = response.json()
    except Exception:
        return None
    models = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(models, list) or not models:
        return None
    return models


def scan_existing_llm_endpoints() -> dict | None:
    """
    Scan for existing LLM endpoints on the system.
    Returns the first working endpoint found, or None if none found.

    Lookup order:
      1. ``core.health_probe.probe_llm`` — canonical Nunba/HARTOS
         resolver (covers env, llama_config.json, port_registry).
      2. Legacy KNOWN_LLM_ENDPOINTS list — third-party LLMs (Ollama,
         LM Studio, vLLM, …) that the canonical resolver doesn't know
         about.

    Returns:
        Dict with endpoint info if found: {"name", "base_url", "completions", "type"}
        None if no endpoints found
    """
    logger.info("Scanning for existing LLM endpoints...")

    # 1. Canonical resolver first — finds Nunba's own llama-server on
    # whatever port it actually bound to (8082 etc.), not just :8080.
    canonical = _scan_via_canonical_resolver()
    if canonical:
        return canonical

    # 2. Legacy third-party LLM scan — Ollama, LM Studio, vLLM, etc.
    for endpoint in KNOWN_LLM_ENDPOINTS:
        try:
            # Try the health endpoint
            health_url = endpoint["base_url"] + endpoint["health"]
            logger.debug(f"Checking {endpoint['name']} at {health_url}")

            response = requests.get(health_url, timeout=2)
            # OpenAI-type entries probe /v1/models, which an HTML/SPA catch-all
            # (the app's own Flask, or a dead :8080) also answers 200 — require a
            # real JSON model list, the SAME gate as scan_openai_compatible_ports.
            if endpoint["type"] == "openai":
                valid = _openai_models_or_none(response) is not None
            else:
                valid = response.status_code == 200
            if valid:
                logger.info(f"Found existing LLM endpoint: {endpoint['name']} at {endpoint['base_url']}")
                return {
                    "name": endpoint["name"],
                    "base_url": endpoint["base_url"],
                    "completions": endpoint["base_url"] + endpoint["completions"],
                    "type": endpoint["type"]
                }
        except requests.exceptions.RequestException:
            # Endpoint not available, continue scanning
            pass
        except Exception as e:
            logger.debug(f"Error checking {endpoint['name']}: {e}")

    logger.info("No existing LLM endpoints found")
    return None


def scan_openai_compatible_ports(ports: list[int] = None) -> dict | None:
    """
    Scan additional ports for OpenAI-compatible endpoints.

    Args:
        ports: List of ports to scan (defaults to common ports)

    Returns:
        Dict with endpoint info if found, None otherwise
    """
    if ports is None:
        # Genuinely-EXTERNAL LLM servers only (Ollama 11434, LM Studio 1234,
        # etc.).  EXCLUDE the app's OWN ports — the Flask backend (5000 desktop /
        # 6777 OS) and the app-managed local llama-server (8080/8081/8082) — so
        # the scan never adopts THIS app as its own "external LLM".  That
        # false-adoption set use_external_llm=True pointing at a dead :8080 and
        # SUPPRESSED the local llama.cpp install (the Flask SPA catch-all returns
        # 200 for /v1/models, which fooled the old status-only check).
        ports = [11434, 1234, 1337, 8000, 3000, 3001, 4000]

    for port in ports:
        try:
            url = f"http://localhost:{port}/v1/models"
            response = requests.get(url, timeout=1)
            # Require a REAL OpenAI /v1/models JSON (a non-empty list of models),
            # not just any 200 — an HTML/SPA page also returns 200 and must NOT be
            # mistaken for an LLM server.  Shared gate: _openai_models_or_none.
            models = _openai_models_or_none(response)
            if not models:
                continue
            logger.info(f"Found OpenAI-compatible LLM endpoint on port {port} "
                        f"({len(models)} model(s))")
            return {
                "name": f"OpenAI-compatible (port {port})",
                "base_url": f"http://localhost:{port}",
                "completions": f"http://localhost:{port}/v1/completions",
                "type": "openai"
            }
        except Exception:
            pass

    return None


class LlamaConfig:
    """Manages Llama.cpp configuration and server lifecycle"""

    def __init__(self, config_dir: str | None = None):
        """
        Initialize configuration

        Args:
            config_dir: Directory for config files (defaults to ~/.nunba)
        """
        home = Path.home()
        self.config_dir = Path(config_dir) if config_dir else home / ".nunba"
        self.config_file = self.config_dir / "llama_config.json"
        self.server_status_file = self.config_dir / "server_status.json"
        self.config_dir.mkdir(parents=True, exist_ok=True)

        self.installer = LlamaInstaller()
        self.server_process: subprocess.Popen | None = None
        self._server_starting = False  # Lock to prevent double start

        # Load or create config
        self.config = self._load_config()

        # Update API base with configured port
        self.api_base = f"http://127.0.0.1:{self.config.get('server_port', 8080)}/v1"

    def _load_config(self) -> dict:
        """Load configuration from file or create default"""
        if self.config_file.exists():
            try:
                with open(self.config_file) as f:
                    cfg = json.load(f)
                # Migrate: bump context_size if still at old default (4096)
                # Agent creation (autogen multi-turn) needs at least 8192
                if cfg.get('context_size', 0) < 8192:
                    cfg['context_size'] = 8192
                    try:
                        with open(self.config_file, 'w') as f:
                            json.dump(cfg, f, indent=2)
                        logger.info("Migrated context_size to 8192")
                    except Exception:
                        pass
                return cfg
            except Exception as e:
                logger.error(f"Failed to load config: {e}")

        # Default configuration
        # Only enable GPU if hardware supports it AND binary will support it
        # Start with conservative default (False), will be updated after installation
        return {
            "first_run": True,
            "auto_start_server": True,
            "selected_model_index": 0,  # Default to recommended model
            "server_port": 8080,
            "use_gpu": False,  # Will be set to True after successful GPU-enabled installation
            "context_size": 8192,
            # Cloud provider fields (non-secret — keys stored in encrypted vault)
            "cloud_provider": None,   # e.g. "openai", "anthropic", "groq"
            "cloud_model": None,      # e.g. "gpt-4o-mini", "claude-sonnet-4-20250514"
            "llm_mode": "local",      # "local" | "cloud" | "hybrid"
            "llama_cpp_build": None,  # Cached llama.cpp build number
        }

    def _save_config(self):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save config: {e}")

    @staticmethod
    def _propagate_llm_url(url: str):
        """Set the canonical LLM URL env var and invalidate caches.

        Called after start_server() detects or starts a server.
        Uses set_local_llm_url() from port_registry which validates
        the URL, sets HEVOLVE_LOCAL_LLM_URL, and clears the resolver cache.
        """
        try:
            from core.port_registry import set_local_llm_url
            set_local_llm_url(url)
        except ImportError:
            # Fallback if HARTOS not available (standalone Nunba dev)
            os.environ['HEVOLVE_LOCAL_LLM_URL'] = url
            logger.info(f"LLM URL set: {url}")

    def is_first_run(self) -> bool:
        """Check if this is the first run"""
        return self.config.get("first_run", True)


    def mark_first_run_complete(self):
        """Mark first run as complete"""
        self.config["first_run"] = False
        self._save_config()

    def get_llm_mode(self) -> str:
        """Return 'local', 'cloud', or 'hybrid'."""
        return self.config.get('llm_mode', 'local')

    def is_cloud_configured(self) -> bool:
        """Check if a cloud provider has been configured via the wizard."""
        return self.config.get('cloud_provider') is not None

    def get_selected_model_preset(self) -> ModelPreset | None:
        """Get the currently selected model preset"""
        index = self.config.get("selected_model_index", 0)
        if 0 <= index < len(MODEL_PRESETS):
            return MODEL_PRESETS[index]
        return None

    def _get_vram_manager(self):
        """Get the global VRAMManager singleton (shared with TTS, vision, etc.)."""
        try:
            from integrations.service_tools.vram_manager import vram_manager
            return vram_manager
        except ImportError:
            return None

    # ── Cohort-aware draft gate ──────────────────────────────────────────
    # Data-scientist rework (2026-04 ship-gate, commit 2acf21a): the plain
    # 10 GB threshold silently regressed English-only users who had room
    # for draft+Kokoro/Piper but were being denied it. The cohort-aware
    # branch below keeps the draft boot for `lang=en + small-TTS` in the
    # 8–10 GB band while still blocking it for Indic users (whose Parler
    # TTS is ~2 GB and would starve).  See `bench/README.md`.

    # TTS engines whose on-GPU resident cost is ≤ ~2 GB — small enough to
    # coexist with main (~3 GB) + draft (~1 GB) + buffers (~1.5 GB) on an
    # 8 GB card.  Indic Parler (~2 GB *but* loaded alongside vocoder +
    # language-specific projectors) and anything larger is excluded.
    _SMALL_TTS_ENGINES = frozenset({'kokoro', 'piper'})

    @staticmethod
    def _read_preferred_lang() -> str:
        """Read the user's preferred language via the canonical resolver.

        Delegates to `core.user_lang.get_preferred_lang()` which handles
        precedence (file → env → node_identity → 'en') with mtime-based
        caching.  Previously this method inlined its own file read —
        fixed as part of the 2026-04-15 language-source consolidation.
        """
        try:
            from core.user_lang import get_preferred_lang
            return get_preferred_lang()
        except Exception:
            return 'en'

    @staticmethod
    def _read_active_tts() -> str | None:
        """Read the active TTS engine id (e.g. 'kokoro', 'piper', 'indic_parler').

        Uses the tts_engine singleton if importable, else returns None.
        None means "unknown" — callers must treat it conservatively.
        """
        try:
            from tts.tts_engine import get_tts_engine
            inst = get_tts_engine()
            backend = getattr(inst, '_active_backend', None)
            if backend and backend != 'none':
                return str(backend).lower()
        except Exception:
            pass
        return None

    @staticmethod
    def _log_draft_decision(decision: str, lang: str, vram_total: float,
                            vram_free: float, active_tts: str | None,
                            reason: str) -> None:
        """Append one JSON line per boot to draft_decision.jsonl (drift monitor).

        Non-fatal: any I/O error is swallowed — the boot path must never
        crash because we couldn't write a log line.
        """
        try:
            import time as _time
            log_dir = Path(os.path.expanduser('~')) / 'Documents' / 'Nunba' / 'logs'
            log_dir.mkdir(parents=True, exist_ok=True)
            log_path = log_dir / 'draft_decision.jsonl'
            entry = {
                'ts': _time.time(),
                'decision': decision,                # 'draft_enabled' | 'main_only'
                'lang': lang,
                'vram_total_gb': round(float(vram_total), 2),
                'vram_free_gb': round(float(vram_free), 2),
                'active_tts': active_tts,
                'reason': reason,
            }
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps(entry) + '\n')
        except Exception as e:
            logger.debug(f"draft_decision log skipped: {e}")

    # ── Memoized boot decision (PERF-18 / task #614) ─────────────────────
    # This is a BOOT decision: main.py:641 calls it once and main.py:652
    # starts the draft server on the result.  Nothing re-reads it afterwards
    # to start or stop that server.
    #
    # /backend/health (main.py:3678) also reports it, and that endpoint is
    # polled.  Re-deriving per poll caused two defects, measured live on an
    # 8 GB box over 38.5 h:
    #
    #   1. PERF — 5,528 GPU probes + mkdir + appends to draft_decision.jsonl
    #      (985 KB, one line every ~25 s, unbounded, no rotation), plus two
    #      INFO emits fanned across four log files, from five threads.
    #   2. CORRECTNESS — the gate branches on `free >= 1.0` and free VRAM
    #      fluctuates, so successive polls could report speculation_enabled
    #      true then false while the actual boot state never changed.  Health
    #      must mirror what BOOTED, not re-decide.
    #
    # So: compute once, memoize, and let the boot path force a real decision
    # with refresh=True.  Same fix shape as #597 / #605 / #572.
    _DRAFT_DECISION_CACHE: bool | None = None
    _DRAFT_DECISION_LOCK = threading.Lock()

    @staticmethod
    def reset_draft_decision_cache() -> None:
        """Drop the memoized boot decision so the next call re-derives.

        Used by the test batteries (which sweep many synthetic VRAM rows
        through one process) and available to a boot retry that genuinely
        needs to re-decide.
        """
        with LlamaConfig._DRAFT_DECISION_LOCK:
            LlamaConfig._DRAFT_DECISION_CACHE = None

    @staticmethod
    def should_boot_draft(*, refresh: bool = False) -> bool:
        """Return the draft-boot decision, computing it at most once.

        Args:
            refresh: force a fresh decision against current VRAM and emit a
                new drift-monitor line.  The boot path uses this; polled
                readers (``/backend/health``) must not.

        The lock serialises the boot thread against concurrent health polls
        so the GPU probe and the jsonl append happen exactly once even when
        health beats boot to the first call.
        """
        with LlamaConfig._DRAFT_DECISION_LOCK:
            if not refresh and LlamaConfig._DRAFT_DECISION_CACHE is not None:
                return LlamaConfig._DRAFT_DECISION_CACHE
            decision = LlamaConfig._decide_draft_boot()
            LlamaConfig._DRAFT_DECISION_CACHE = decision
            return decision

    @staticmethod
    def _decide_draft_boot() -> bool:
        """Whether the system has enough VRAM to run a separate draft model.

        Cohort-aware gate (post-2acf21a rework):

            VRAM >= 10 GB                    → draft (any lang, any TTS)
            VRAM in [8,10) GB AND lang=='en' AND active_tts in {kokoro, piper}
                                             → draft (small-TTS English cohort)
            otherwise                        → main-only

        Budget math for dual (main + draft + TTS):
            main LLM (Qwen3-4B, Q4)        ~3.0 GB
            draft LLM (Qwen3.5-0.8B, Q4)   ~1.0 GB
            mmproj (vision projector)       ~0.3 GB
            llama buffers + KV              ~1.5 GB
            TTS headroom:
                kokoro / piper              ~0.5–1.0 GB   (fits on 8 GB w/ draft)
                indic_parler                ~2.0 GB       (needs 10 GB total)
                cosyvoice                   ~4.0 GB       (needs 10 GB total)
                chatterbox                  ~5.6 GB       (needs 16 GB, no draft anyway)

        Indic users never hit the 8–10 GB fast-path: their TTS ladder
        resolves to indic_parler or F5, both of which blow the budget
        when combined with draft. Falling back to main-only on 8 GB
        for them is by design — it reclaims ~1 GB so Parler loads.

        Every call emits one JSON line to
        ~/Documents/Nunba/logs/draft_decision.jsonl (drift monitor).  Callers
        must reach this through ``should_boot_draft()``, which memoizes it —
        calling it directly per request is what made that file grow by 3,445
        lines/day (task #614).
        """
        # Defaults for the log line if VRAM detection itself fails.
        lang = LlamaConfig._read_preferred_lang()
        active_tts = LlamaConfig._read_active_tts()
        total = 0.0
        free = 0.0

        try:
            from integrations.service_tools.vram_manager import vram_manager
            total = float(vram_manager.get_total_vram())
            free = float(vram_manager.get_free_vram())
            gpu = vram_manager.detect_gpu()

            if not gpu.get('cuda_available'):
                LlamaConfig._log_draft_decision(
                    'main_only', lang, total, free, active_tts, 'no_cuda')
                return False

            # Primary gate: generous VRAM — dual is safe for any cohort.
            if total >= 10.0 and free >= 1.0:
                LlamaConfig._log_draft_decision(
                    'draft_enabled', lang, total, free, active_tts,
                    'vram_ge_10gb')
                logger.info(
                    f"Draft boot decision: total={total:.0f}GB, "
                    f"free={free:.1f}GB → dual (>=10GB primary)")
                return True

            # Cohort-aware fast-path: 8–10 GB English + small TTS.
            if (8.0 <= total < 10.0 and free >= 1.0
                    and lang == 'en'
                    and active_tts in LlamaConfig._SMALL_TTS_ENGINES):
                LlamaConfig._log_draft_decision(
                    'draft_enabled', lang, total, free, active_tts,
                    'cohort_en_small_tts_8to10gb')
                logger.info(
                    f"Draft boot decision: total={total:.0f}GB, "
                    f"free={free:.1f}GB, lang=en, tts={active_tts} "
                    f"→ dual (cohort-aware 8–10GB fast-path)")
                return True

            # Everyone else: main-only.
            #
            # Draft skip-gate: non-Latin-script langs (all Indic, CJK,
            # Arabic, etc.) skip the draft model entirely.  The 0.8B
            # draft is English-dominant and produces garbled speculative
            # tokens for those scripts, forcing main-model rejection on
            # every turn and wiping out the latency win.  Constant lives
            # in core.constants.NON_LATIN_SCRIPT_LANGS per the DRY fix
            # from an earlier session.
            _skip_draft_langs = None
            try:
                from core.constants import NON_LATIN_SCRIPT_LANGS as _skip_draft_langs
            except Exception:
                pass
            _should_skip_draft = (
                (_skip_draft_langs is not None and lang in _skip_draft_langs)
                or lang != 'en'
            )
            reason = (
                'vram_below_8gb' if total < 8.0
                else 'cohort_indic_or_large_tts' if _should_skip_draft or (
                    active_tts not in LlamaConfig._SMALL_TTS_ENGINES)
                else 'free_vram_too_low'
            )
            LlamaConfig._log_draft_decision(
                'main_only', lang, total, free, active_tts, reason)
            logger.info(
                f"Draft boot decision: total={total:.0f}GB, "
                f"free={free:.1f}GB, lang={lang}, tts={active_tts} "
                f"→ single (main-only; reason={reason})")
            return False

        except Exception as e:
            LlamaConfig._log_draft_decision(
                'main_only', lang, total, free, active_tts, f'exception:{type(e).__name__}')
            return False  # safe default — single model, no wasted startup

    def diagnose(self) -> dict:
        """Comprehensive hardware + software diagnosis for smart auto-start.

        Returns a dict describing GPU state, binary state, model state, mmproj state,
        and a prioritized list of actions needed to get the LLM running.

        Action types:
          'start'             — everything ready, just start the server
          'start_cpu'         — model+binary ready but must run CPU-only (GPU occupied/unavailable)
          'upgrade_binary'    — CPU binary present but GPU is available, download CUDA build
          'downgrade_model'   — current model too big for available VRAM/RAM, need smaller one
          'download_model'    — no model on disk, must download
          'download_mmproj'   — model on disk but vision projector missing
          'install_binary'    — no llama-server found at all
          'download_all'      — neither model nor binary available
        """
        diag = {
            # GPU
            'gpu_detected': False,
            'gpu_type': 'none',        # 'cuda', 'metal', 'none'
            'gpu_name': None,
            'gpu_total_gb': 0.0,
            'gpu_free_gb': 0.0,
            'gpu_occupied': False,      # GPU exists but free < 20% of total
            'ram_gb': 0.0,
            'vram_allocations': {},     # what other models (TTS, vision) hold
            # Binary
            'binary_found': False,
            'binary_path': None,
            'binary_supports_gpu': False,
            'binary_mismatch': None,    # 'need_gpu_build', 'gpu_build_no_gpu', None
            # Model (best for current hardware)
            'best_model_index': None,
            'best_model_name': None,
            'best_model_size_mb': 0,
            'best_model_downloaded': False,
            'best_model_fits_compute': True,
            'mmproj_available': False,
            'mmproj_needed': False,
            # Current configured model (may differ from best)
            'current_model_index': None,
            'current_model_name': None,
            'current_model_downloaded': False,
            'current_model_too_big': False,
            # Budget
            'compute_budget_mb': 0,
            'compute_source': 'ram',    # 'vram' or 'ram'
            # Action
            'action': 'download_all',   # primary action needed
            'actions': [],              # all actions in priority order
            'run_mode': 'cpu',          # 'gpu', 'cpu' — how we'll actually run
            'message': '',
        }

        # ── GPU + compute budget via unified VRAMManager (shared with TTS, vision) ──
        vm = self._get_vram_manager()
        if vm:
            gpu_info = vm.detect_gpu()
            diag['gpu_type'] = 'cuda' if gpu_info.get('cuda_available') else (
                'metal' if gpu_info.get('metal_available') else 'none')
            diag['gpu_detected'] = diag['gpu_type'] != 'none'
            diag['gpu_name'] = gpu_info.get('name')
            diag['gpu_total_gb'] = gpu_info.get('total_gb', 0.0)
            # Use get_free_vram() — accounts for TTS/vision/other allocations
            diag['gpu_free_gb'] = round(vm.get_free_vram(), 2)
            diag['vram_allocations'] = vm.get_allocations()  # what other models hold
        else:
            if self.installer.gpu_available != 'none':
                diag['gpu_detected'] = True
                diag['gpu_type'] = self.installer.gpu_available

        # GPU is "occupied" if <20% of total is free (TTS, vision, or external model)
        if diag['gpu_detected'] and diag['gpu_total_gb'] > 0:
            free_pct = diag['gpu_free_gb'] / diag['gpu_total_gb']
            diag['gpu_occupied'] = free_pct < 0.20

        # ── RAM ────────────────────────────────────────────────────
        try:
            import psutil
            diag['ram_gb'] = round(psutil.virtual_memory().available / (1024 ** 3), 2)
        except Exception:
            diag['ram_gb'] = 4.0

        # ── Compute budget via VRAMManager (public API) ────────
        try:
            from integrations.service_tools.vram_manager import vram_manager
            gpu = vram_manager.detect_gpu()
            free_vram = vram_manager.get_free_vram()
            gpu_available = gpu.get('cuda_available', False) or gpu.get('metal_available', False)
            if gpu_available and free_vram > 0.5:
                budget_mb = int(free_vram * 1024)
                source = 'vram'
            else:
                import psutil
                budget_mb = int(psutil.virtual_memory().available / (1024 * 1024) / 2)
                source = 'ram'
        except Exception:
            budget_mb = 2000
            source = 'ram'
        diag['compute_budget_mb'] = budget_mb
        diag['compute_source'] = source
        diag['run_mode'] = 'gpu' if source == 'vram' else 'cpu'

        # ── Binary detection ───────────────────────────────────────
        llama_server = self.installer.find_llama_server(check_system_first=True)
        if llama_server:
            diag['binary_found'] = True
            diag['binary_path'] = llama_server
            # Check if binary has GPU support (CUDA DLLs next to it)
            from pathlib import Path as _P
            bin_dir = _P(llama_server).parent
            cuda_dlls = list(bin_dir.glob("ggml-cuda*.dll")) + list(bin_dir.glob("ggml-cuda*.so"))
            if cuda_dlls:
                diag['binary_supports_gpu'] = True
            elif "darwin" in self.installer.os_name:
                diag['binary_supports_gpu'] = True  # Metal on macOS
            # Detect mismatches
            if diag['gpu_detected'] and not diag['binary_supports_gpu'] and diag['gpu_type'] == 'cuda':
                diag['binary_mismatch'] = 'need_gpu_build'
            elif not diag['gpu_detected'] and diag['binary_supports_gpu'] and diag['gpu_type'] != 'metal':
                diag['binary_mismatch'] = 'gpu_build_no_gpu'

        # ── Best model selection via orchestrator catalog ──────
        best_idx = self.config.get('selected_model_index', 0)
        try:
            from models.orchestrator import get_orchestrator
            entry = get_orchestrator().select_best('llm')
            if entry:
                # Match catalog entry back to MODEL_PRESETS index
                for i, p in enumerate(MODEL_PRESETS):
                    if p.display_name == entry.name or p.file_name == entry.files.get('model', ''):
                        best_idx = i
                        break
        except Exception:
            pass
        best_preset = MODEL_PRESETS[best_idx] if best_idx < len(MODEL_PRESETS) else MODEL_PRESETS[0]
        diag['best_model_index'] = best_idx
        diag['best_model_name'] = best_preset.display_name
        diag['best_model_size_mb'] = best_preset.size_mb
        diag['best_model_downloaded'] = self.installer.get_model_path(best_preset) is not None
        diag['best_model_fits_compute'] = best_preset.size_mb <= diag['compute_budget_mb']
        diag['mmproj_needed'] = best_preset.has_vision and bool(best_preset.mmproj_file)
        if diag['mmproj_needed']:
            diag['mmproj_available'] = self.installer.get_mmproj_path(best_preset) is not None

        # ── Compute-fit ↔ downloaded coherence ─────────────────────
        # The compute-best model may not be on disk (install-time
        # _select_model_for_compute fitted this box to the 0.8B, so only the
        # 0.8B was downloaded).  Advertising / booting the bigger "best" would
        # (a) show the wrong model on the setup card and (b) let auto_load try
        # to start a model that isn't downloaded while a fitting one is.  Prefer
        # the largest DOWNLOADED model that fits — the SAME helper auto_setup
        # uses (live disk check), no parallel selection.
        if not diag['best_model_downloaded']:
            alt_idx = self._find_best_downloaded_model(diag['compute_budget_mb'])
            if alt_idx is not None and alt_idx != best_idx:
                best_idx = alt_idx
                best_preset = MODEL_PRESETS[best_idx]
                diag['best_model_index'] = best_idx
                diag['best_model_name'] = best_preset.display_name
                diag['best_model_size_mb'] = best_preset.size_mb
                diag['best_model_downloaded'] = True
                diag['best_model_fits_compute'] = (
                    best_preset.size_mb <= diag['compute_budget_mb'])
                diag['mmproj_needed'] = (
                    best_preset.has_vision and bool(best_preset.mmproj_file))
                diag['mmproj_available'] = (
                    self.installer.get_mmproj_path(best_preset) is not None
                    if diag['mmproj_needed'] else False)

        # ── Build-version check (existing binary, build number floor) ──
        # If a binary is already installed and no CPU/CUDA mismatch was
        # detected above, also check whether the build number meets the
        # selected model's MIN_LLAMACPP_BUILD floor.  When it doesn't,
        # reuse the same 'need_gpu_build' mismatch token so the existing
        # upgrade path (auto_setup → upgrading_binary → try_download_prebuilt)
        # downloads the latest GitHub release — which is by definition at
        # or above the floor.  Without this, an existing-but-too-old
        # binary leaves auto_setup blind: no action is appended and the
        # wizard never surfaces an upgrade card.
        if diag['binary_found'] and not diag['binary_mismatch']:
            # Re-resolve version-aware now that the preset (and therefore its
            # build floor) is known.  The detection at the top of this method
            # runs preset-blind and takes the first-existing candidate, so a
            # stale system/trueflow copy would be measured instead of the
            # Nunba-managed one that actually satisfies the floor.  Passing
            # that stale path made this check report "too old", set
            # need_gpu_build, and re-download llama.cpp on EVERY boot while a
            # satisfying build sat unused on disk.  Same resolver the spawn
            # path uses, so diag and the server agree on one binary.
            if best_preset.min_build is not None:
                _aware = self.installer.find_llama_server(
                    check_system_first=True, min_build=best_preset.min_build)
                if _aware:
                    diag['binary_path'] = _aware
            is_compat, cur_ver, req_ver = self.installer.check_version_for_model(
                best_preset, llama_server_path=diag['binary_path'])
            if not is_compat and req_ver is not None:
                diag['binary_mismatch'] = 'need_gpu_build'
                diag['binary_current_build'] = cur_ver
                diag['binary_required_build'] = req_ver

        # ── Current configured model ──────────────────────────────
        cur_idx = self.config.get('selected_model_index', 0)
        if 0 <= cur_idx < len(MODEL_PRESETS):
            cur_preset = MODEL_PRESETS[cur_idx]
            diag['current_model_index'] = cur_idx
            diag['current_model_name'] = cur_preset.display_name
            diag['current_model_downloaded'] = self.installer.get_model_path(cur_preset) is not None
            diag['current_model_too_big'] = cur_preset.size_mb > diag['compute_budget_mb']

        # ── Determine actions ──────────────────────────────────────
        actions = []

        if not diag['binary_found']:
            actions.append('install_binary')

        if diag['binary_mismatch'] == 'need_gpu_build':
            actions.append('upgrade_binary')

        # If best model is downloaded, check if it actually fits
        if diag['best_model_downloaded']:
            if not diag['best_model_fits_compute']:
                # Model on disk but too big for current compute — find one that fits
                actions.append('downgrade_model')
            elif diag['mmproj_needed'] and not diag['mmproj_available']:
                actions.append('download_mmproj')
            # If model + binary are ready
            if not actions or actions == ['upgrade_binary']:
                if diag['gpu_occupied'] or (diag['gpu_detected'] and not diag['binary_supports_gpu']):
                    actions.append('start_cpu')
                else:
                    actions.append('start')
        else:
            # Model not downloaded — check if a different downloaded model fits
            found_alternative = False
            for i, preset in enumerate(MODEL_PRESETS):
                if preset.size_mb <= diag['compute_budget_mb'] and self.installer.get_model_path(preset):
                    found_alternative = True
                    break
            if found_alternative:
                # We have an alternative model that fits — use it
                if diag['gpu_occupied']:
                    actions.append('start_cpu')
                else:
                    actions.append('start')
            else:
                actions.append('download_model')

        diag['actions'] = actions
        diag['action'] = actions[0] if actions else 'start'

        # ── Human-readable message ─────────────────────────────────
        msgs = {
            'start': f'{best_preset.display_name} is ready — starting with {diag["run_mode"].upper()}.',
            'start_cpu': (
                f'GPU is {"occupied by another model" if diag["gpu_occupied"] else "not available"}. '
                f'Starting {best_preset.display_name} in CPU mode.'),
            'upgrade_binary': (
                f'GPU detected ({diag["gpu_name"] or diag["gpu_type"]}) '
                f'but llama.cpp is CPU-only. Upgrading to CUDA build.'),
            'downgrade_model': f'{best_preset.display_name} ({best_preset.size_mb}MB) is too big for '
                               f'{diag["compute_budget_mb"]}MB budget. Selecting a smaller model.',
            'download_model': f'No suitable model found on disk. Recommend downloading '
                              f'{best_preset.display_name} ({best_preset.size_mb}MB).',
            'download_mmproj': (
                f'{best_preset.display_name} found but vision projector '
                f'(mmproj) is missing. Downloading it.'),
            'install_binary': 'llama.cpp server not found. Installing it.',
            'download_all': 'No local LLM setup found. Need to download model and install llama.cpp.',
        }
        diag['message'] = msgs.get(diag['action'], '')

        return diag

    def auto_setup(self, progress_callback=None, model_index=None) -> dict:
        """Smart auto-setup: diagnose hardware, handle all edge cases, start server.

        Handles:
          - GPU binary + no GPU → CPU mode
          - CPU binary + GPU available → upgrade binary then start with GPU
          - GPU occupied by non-completion model → CPU mode
          - Model on disk but too big for available VRAM → select smaller model
          - Model available, no binary → install binary
          - Neither available → download both
          - mmproj missing → download just mmproj
          - GPU is small but big model on disk → download right-sized model

        Args:
            progress_callback: Optional callable(stage: str, progress: float)
            model_index: Optional int — override model selection (from frontend card)

        Returns:
            dict with keys: success, model_name, gpu_mode, message, diagnosis
        """
        # ── 0. Check for existing LLM servers first ─────────────────
        # Reuse existing llama.cpp/Ollama/LM Studio instead of starting a new one
        if progress_callback:
            progress_callback('scanning', 0.02)

        existing = scan_existing_llm_endpoints()
        if not existing:
            existing = scan_openai_compatible_ports()

        if existing:
            logger.info(f"Found existing LLM: {existing['name']} at {existing['base_url']}")
            self.api_base = existing['base_url'] + '/v1'
            self.config['llm_mode'] = 'local'
            self.config['custom_api_base'] = existing['base_url']
            self._save_config()
            if progress_callback:
                progress_callback('ready', 1.0)
            return {
                'success': True,
                'model_name': existing['name'],
                'gpu_mode': True,
                'message': f"Using existing {existing['name']}",
                'diagnosis': {'action': 'reuse_existing', 'endpoint': existing},
            }

        diag = self.diagnose()
        logger.info(f"Auto-setup diagnosis: action={diag['action']}, actions={diag['actions']}, "
                    f"run_mode={diag['run_mode']}, gpu={diag['gpu_type']}, "
                    f"budget={diag['compute_budget_mb']}MB")

        if progress_callback:
            progress_callback('diagnosing', 0.05)

        # ── 1. Resolve model selection ─────────────────────────────
        # Dynamic VRAM-aware: reserve VRAM for other models (TTS, STT, VLM)
        # that will coexist on the same GPU. Pick the largest LLM that fits.
        if model_index is not None and 0 <= model_index < len(MODEL_PRESETS):
            model_idx = model_index
        elif 'downgrade_model' in diag['actions']:
            model_idx = self._find_best_fitting_model(diag['compute_budget_mb'])
            logger.info(f"Downgraded model selection: {MODEL_PRESETS[model_idx].display_name} "
                        f"(fits {diag['compute_budget_mb']}MB budget)")
        else:
            model_idx = diag['best_model_index']

        # VRAM coexistence: VRAMManager.get_free_vram() is the real budget.
        # It already accounts for everything currently loaded on the GPU.
        preset = MODEL_PRESETS[model_idx]
        try:
            vram_mgr = self._get_vram_manager()
            if vram_mgr:
                free_gb = vram_mgr.get_free_vram()
                if free_gb > 0:
                    available_mb = int(free_gb * 1024)
                    if preset.size_mb > available_mb:
                        better_idx = self._find_best_fitting_model(available_mb)
                        if better_idx != model_idx:
                            logger.info(
                                f"VRAM {free_gb:.1f}GB free: "
                                f"{preset.display_name} ({preset.size_mb}MB) too large, "
                                f"selecting {MODEL_PRESETS[better_idx].display_name}")
                            model_idx = better_idx
                            preset = MODEL_PRESETS[model_idx]
        except Exception as _e:
            logger.debug(f"VRAM coexistence check skipped: {_e}")

        # ── 2. Ensure model is on disk ─────────────────────────────
        if progress_callback:
            progress_callback('checking_model', 0.1)

        model_path = self.installer.get_model_path(preset)
        if not model_path:
            # Model not on disk — can we use an alternative that IS downloaded?
            alt_idx = self._find_best_downloaded_model(diag['compute_budget_mb'])
            if alt_idx is not None:
                logger.info(f"Using already-downloaded model: {MODEL_PRESETS[alt_idx].display_name}")
                model_idx = alt_idx
                preset = MODEL_PRESETS[model_idx]
                model_path = self.installer.get_model_path(preset)
            else:
                # Must download
                if progress_callback:
                    progress_callback('downloading_model', 0.15)
                logger.info(f"Auto-setup: downloading {preset.display_name}...")
                success = self.installer.download_model(preset, progress_callback=progress_callback)
                if not success:
                    return {
                        'success': False,
                        'model_name': preset.display_name,
                        'gpu_mode': diag['run_mode'] == 'gpu',
                        'message': f'Failed to download {preset.display_name}',
                        'diagnosis': diag,
                    }
                model_path = self.installer.get_model_path(preset)

        # ── 3. Ensure mmproj for vision models ─────────────────────
        if preset.has_vision and preset.mmproj_file:
            mmproj_path = self.installer.get_mmproj_path(preset)
            if not mmproj_path:
                if progress_callback:
                    progress_callback('downloading_mmproj', 0.4)
                logger.info(f"Auto-setup: downloading vision projector for {preset.display_name}...")
                self._download_mmproj_only(preset)

        # ── 4. Ensure llama.cpp binary ─────────────────────────────
        if progress_callback:
            progress_callback('checking_binary', 0.5)

        llama_server = self.installer.find_llama_server(check_system_first=True)

        # Case: CPU binary but GPU available → try upgrade
        if llama_server and diag['binary_mismatch'] == 'need_gpu_build':
            if progress_callback:
                progress_callback('upgrading_binary', 0.55)
            logger.info("Upgrading llama.cpp to CUDA build...")
            try:
                upgraded = self.installer.try_download_prebuilt()
                _upgrade_err = None
            except Exception as _e:
                upgraded = False
                _upgrade_err = _e
            if upgraded and self.installer.binary_supports_gpu:
                llama_server = self.installer.find_llama_server(check_system_first=True)
                diag['run_mode'] = 'gpu'
                logger.info("Successfully upgraded to CUDA build")
            else:
                _reason = (f'network/disk error: {_upgrade_err!r}'
                           if _upgrade_err is not None
                           else 'try_download_prebuilt returned False (no '
                                'matching prebuilt asset, github unreachable, '
                                'or write-permission denied on install dir)')
                logger.warning(
                    f"FALLBACK: llama.cpp upgrade failed — {_reason}. "
                    f"Continuing with installed binary "
                    f"(b{diag.get('binary_current_build')}); "
                    f"_do_start_server will warn-and-proceed for any "
                    f"min_build floor mismatch (build-gated features like "
                    f"MTP / spec-ngram are suppressed). Auto-setup will "
                    f"retry the upgrade on next launch."
                )
                diag['run_mode'] = 'cpu'

        # Case: no binary at all
        if not llama_server:
            if progress_callback:
                progress_callback('installing_binary', 0.6)
            logger.info("Auto-setup: installing llama.cpp...")
            success = self.installer.install_llama_cpp()
            if not success:
                return {
                    'success': False,
                    'model_name': preset.display_name,
                    'gpu_mode': False,
                    'message': 'Failed to install llama.cpp',
                    'diagnosis': diag,
                }
            llama_server = self.installer.find_llama_server(check_system_first=True)

        # ── 5. Final run_mode decision ─────────────────────────────
        # GPU binary + no GPU hardware → CPU mode
        if diag['binary_mismatch'] == 'gpu_build_no_gpu':
            diag['run_mode'] = 'cpu'

        # GPU occupied → CPU mode
        if diag['gpu_occupied']:
            diag['run_mode'] = 'cpu'
            logger.info(f"GPU occupied ({diag['gpu_free_gb']:.1f}/{diag['gpu_total_gb']:.1f}GB free) — CPU mode")

        # Model too big for VRAM even though GPU available → CPU mode
        if diag['run_mode'] == 'gpu' and preset.size_mb > diag['compute_budget_mb']:
            diag['run_mode'] = 'cpu'
            logger.info(f"Model {preset.size_mb}MB > budget {diag['compute_budget_mb']}MB — CPU mode")

        # ── 6. Apply run_mode to config ────────────────────────────
        self.config['selected_model_index'] = model_idx
        self.config['first_run'] = False
        self.config['llm_mode'] = 'local'
        self.config['use_gpu'] = (diag['run_mode'] == 'gpu')
        self._save_config()

        # ── 7. Start server ────────────────────────────────────────
        if progress_callback:
            progress_callback('starting', 0.85)

        started = self.start_server(model_preset=preset)

        # ── 8. Register VRAM allocation (so TTS/vision see the LLM's reservation) ──
        # Canonical key 'llm' — idempotent, same key used by ModelOrchestrator
        if started and diag['run_mode'] == 'gpu':
            vm = self._get_vram_manager()
            if vm:
                model_gb = preset.size_mb / 1024.0
                vm._allocations['llm'] = model_gb
                logger.info(f"Registered VRAM allocation: llm = {model_gb:.1f}GB")

        mode_label = 'GPU' if diag['run_mode'] == 'gpu' else 'CPU'
        if started:
            msg = f'{preset.display_name} is running ({mode_label})'
            if diag['gpu_occupied']:
                msg += ' — GPU was occupied, using CPU'
            elif diag['binary_mismatch'] == 'need_gpu_build' and diag['run_mode'] == 'cpu':
                msg += ' — CUDA upgrade failed, using CPU'
        else:
            msg = f'Server failed to start ({preset.display_name}, {mode_label})'

        return {
            'success': started,
            'model_name': preset.display_name,
            'model_index': model_idx,
            'gpu_mode': diag['run_mode'] == 'gpu',
            'run_mode': diag['run_mode'],
            'size_mb': preset.size_mb,
            'message': msg,
            'diagnosis': diag,
        }

    def _find_best_fitting_model(self, budget_mb: int) -> int:
        """Find the largest Qwen3.5 model that fits within the compute budget."""
        best_idx = 1  # Qwen3.5-2B as safe minimum
        best_size = 0
        for i, preset in enumerate(MODEL_PRESETS):
            if preset.size_mb <= budget_mb and preset.size_mb > best_size:
                best_idx = i
                best_size = preset.size_mb
        return best_idx

    def _find_best_downloaded_model(self, budget_mb: int) -> int | None:
        """Find the largest already-downloaded model that fits the budget."""
        best_idx = None
        best_size = 0
        for i, preset in enumerate(MODEL_PRESETS):
            if preset.size_mb <= budget_mb and self.installer.get_model_path(preset):
                if preset.size_mb > best_size:
                    best_idx = i
                    best_size = preset.size_mb
        return best_idx

    def _download_mmproj_only(self, preset: ModelPreset) -> bool:
        """Download just the vision projector (mmproj) for a model.

        Uses the same URL resolution as ``llama_installer.py:download_model``
        (lines 991-1009) — the HF repo filename is ``preset.mmproj_source_file``
        (e.g. ``mmproj-F16.gguf``), NOT ``preset.mmproj_file`` (which is the
        model-specific LOCAL name like ``mmproj-Qwen3.5-0.8B-F16.gguf``).

        The previous implementation was a parallel download path that used
        ``preset.mmproj_file`` for the HF URL, which didn't exist on HuggingFace
        (404), and also doubled the local name via a base-name injection
        (``mmproj-Qwen3.5-0.8B-Qwen3.5-0.8B-F16.gguf``). That was the root
        cause of T9 — the draft 0.8B started without vision because its mmproj
        always failed to download.
        """
        if not preset.has_vision or not preset.mmproj_file:
            return True
        try:
            mmproj_path = self.installer.models_dir / preset.mmproj_file
            if mmproj_path.exists():
                return True
            # Also check if the installer can find it via its search paths
            found = self.installer.get_mmproj_path(preset)
            if found:
                return True
            # Download from HF — use mmproj_source_file (the actual HF filename)
            # just like llama_installer.py:download_model does at line 997.
            hf_name = preset.mmproj_source_file or preset.mmproj_file
            mmproj_url = f"https://huggingface.co/{preset.repo_id}/resolve/main/{hf_name}"
            logger.info(f"Downloading mmproj: {hf_name} -> {preset.mmproj_file}")
            self.installer.download_file_with_progress(mmproj_url, mmproj_path)
            return mmproj_path.exists()
        except Exception as e:
            logger.error(f"mmproj download failed: {e}")
            return False

    def is_llm_available(self) -> bool:
        """Check if any LLM endpoint is ready for completions.

        Delegates to `core.verified_llm.is_llm_inference_verified` which
        issues a real /v1/chat/completions probe and asserts non-empty
        content. This replaces the older /v1/models shallow check —
        /v1/models can report a loaded catalog entry even when inference
        is broken.

        Symptom class: shallow-signal health check (see HARTOS Stage-A
        Symptom #4 from 2026-04-16 master-orchestrator run).
        """
        if self.is_cloud_configured():
            return True
        try:
            from core.verified_llm import is_llm_inference_verified
        except ImportError:
            # Fallback to the legacy /v1/models probe if HARTOS core
            # isn't importable (shouldn't happen in bundled mode but
            # defense-in-depth for dev-tree edge cases).
            return self._is_llm_available_legacy()
        port = self.config.get('server_port', 8080)
        return is_llm_inference_verified(
            url=f'http://127.0.0.1:{port}',
            timeout=5.0,
        )

    def _is_llm_available_legacy(self) -> bool:
        """Legacy shallow-signal probe (kept only for HARTOS-missing edge case)."""
        try:
            import json as _json
            import urllib.request
            port = self.config.get('server_port', 8080)
            req = urllib.request.Request(
                f'http://127.0.0.1:{port}/v1/models',
                method='GET'
            )
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status != 200:
                    return False
                data = _json.loads(resp.read())
                return bool(data.get('data'))
        except Exception:
            return False

    def is_llm_server_running(self) -> bool:
        """Check if a llama-server process is reachable — even if still loading a model.

        Unlike is_llm_available() (which requires 200 = healthy), this returns True
        for ANY HTTP response (200, 500, 503). Only returns False when the connection
        is refused (no process listening). Used by startup logic to avoid launching
        a duplicate server while a model is still loading.
        """
        if self.is_cloud_configured():
            return True
        import urllib.request
        port = self.config.get('server_port', 8080)
        try:
            req = urllib.request.Request(f'http://127.0.0.1:{port}/health', method='GET')
            with urllib.request.urlopen(req, timeout=2):
                return True  # 200 = healthy
        except urllib.request.HTTPError:
            return True  # 500/503 = server exists, model loading
        except Exception:
            return False  # ConnectionRefused/Timeout = no server

    def detect_and_cache_version(self) -> int | None:
        """Detect the installed llama.cpp build number and cache it in config."""
        version = self.installer.get_version()
        if version is not None:
            self.config["llama_cpp_build"] = version
            self._save_config()
            logger.info(f"Detected llama.cpp build: b{version}")
        return version

    def get_cached_version(self) -> int | None:
        """Get the cached llama.cpp build number from config."""
        return self.config.get("llama_cpp_build")

    def is_port_available(self, port: int) -> bool:
        """
        Check if a port is available for use

        Args:
            port: Port number to check

        Returns:
            True if port is available, False if occupied
        """
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                s.bind(('127.0.0.1', port))
                return True
        except Exception:
            return False

    def find_available_port(self, start_port: int = 8080, max_attempts: int = 10) -> int | None:
        """
        Find an available port starting from start_port

        Args:
            start_port: Port to start searching from
            max_attempts: Maximum number of ports to try

        Returns:
            Available port number or None if none found
        """
        for port in range(start_port, start_port + max_attempts):
            if self.is_port_available(port):
                logger.info(f"Found available port: {port}")
                return port
        return None

    def check_server_type(self, port: int) -> tuple[str, dict | None]:
        """
        Check what type of server is running on the given port

        Args:
            port: Port to check

        Returns:
            Tuple of (server_type, server_info)
            server_type: One of ServerType enum values
            server_info: Dict with server details if applicable
        """
        try:
            # Try health endpoint first (with Nunba identifier)
            health_url = f"http://127.0.0.1:{port}/health"
            response = requests.get(health_url, timeout=2)

            if response.status_code == 200:
                try:
                    health_data = response.json()

                    # Check if this is a Nunba-managed server
                    if health_data.get("managed_by") == "Nunba":
                        logger.info(f"Detected Nunba-managed llama.cpp server on port {port}")
                        return ServerType.NUNBA_MANAGED, health_data

                    # Check if it's llama.cpp (has "status" field)
                    if "status" in health_data:
                        logger.info(f"Detected external llama.cpp server on port {port}")
                        return ServerType.EXTERNAL_LLAMA, health_data

                except Exception:
                    pass
            elif response.status_code == 503:
                # llama-server is alive but the model is mid-load.  Body is
                # ``{"error":{"message":"Loading model","type":"unavailable_error","code":503}}``.
                # Treat this as ALIVE — the server has bound the port and is
                # serving HTTP, it's just warming up.  Returning OTHER_SERVICE
                # here would cause the LLM-WATCHDOG to queue another restart,
                # which extends the loading window, which re-triggers another
                # 503 on the next probe — self-amplifying restart loop seen
                # 2026-05-11 20:15-20:20 (crash_count climbed 2→3→4 entirely
                # from this false-alarm cycle, while llama-server stayed up).
                try:
                    body = response.json()
                    err_msg = ''
                    if isinstance(body, dict):
                        err_msg = (body.get('error') or {}).get('message', '') \
                            if isinstance(body.get('error'), dict) \
                            else str(body.get('error') or '')
                    if 'Loading model' in err_msg or 'loading' in err_msg.lower():
                        logger.info(
                            f"llama-server on port {port} alive but loading "
                            f"model (HTTP 503) — treating as EXTERNAL_LLAMA "
                            f"to suppress restart-amplification.")
                        return ServerType.EXTERNAL_LLAMA, {"status": "loading"}
                except Exception:
                    # Body wasn't JSON, but a 503 from /health on the LLM
                    # port is still much more likely 'warming up' than
                    # 'some other service' — same call: trust port over
                    # status code.
                    logger.info(
                        f"llama-server on port {port} returned 503 with "
                        f"non-JSON body — treating as alive-but-warming.")
                    return ServerType.EXTERNAL_LLAMA, {"status": "loading"}

            # Try /v1/models endpoint (llama.cpp compatibility)
            models_url = f"http://127.0.0.1:{port}/v1/models"
            response = requests.get(models_url, timeout=2)

            if response.status_code == 200:
                try:
                    data = response.json()
                    # llama.cpp returns {"object":"list","data":[...]}
                    if data.get("object") == "list":
                        logger.info(f"Detected external llama.cpp server on port {port} (via /v1/models)")
                        return ServerType.EXTERNAL_LLAMA, {"models": data.get("data", [])}
                except Exception:
                    pass
            elif response.status_code == 503:
                # Same warming-up case via the OpenAI-compat endpoint.
                logger.info(
                    f"llama-server on port {port} /v1/models returned 503 "
                    f"— treating as alive-but-warming.")
                return ServerType.EXTERNAL_LLAMA, {"status": "loading"}

            # Some other service is running
            logger.warning(f"Port {port} is occupied by a non-llama.cpp service")
            return ServerType.OTHER_SERVICE, None

        except requests.exceptions.ConnectionError:
            # Nothing running on this port
            return ServerType.NOT_RUNNING, None
        except Exception as e:
            logger.debug(f"Error checking server on port {port}: {e}")
            return ServerType.NOT_RUNNING, None

    def check_server_running(self, port: int | None = None) -> bool:
        """
        Check if llama.cpp server is running on the specified port

        Args:
            port: Port to check (uses configured port if None)

        Returns:
            True if llama.cpp server is running, False otherwise
        """
        if port is None:
            port = self.config.get("server_port", 8080)

        server_type, _ = self.check_server_type(port)
        return server_type in [ServerType.NUNBA_MANAGED, ServerType.EXTERNAL_LLAMA]

    def _write_server_status(self, running: bool, pid: int | None = None,
                             model: str | None = None, port: int | None = None):
        """Write server status to SHARED file for cross-app coordination.

        Written to both:
          - ~/.nunba/server_status.json (Nunba-local)
          - ~/.trueflow/server_status.json (TrueFlow reads this)
        Format matches TrueFlow's ServerStatus data class so both apps
        can discover each other's servers.
        """
        # Liveness just changed — drop the cached port probe so the next
        # check_llama_health() re-probes instead of reporting the previous state
        # for up to _LLAMA_PORT_TTL_S.  This is the single chokepoint for both
        # transitions: spawn calls us with True, stop_server with False.
        invalidate_llama_port_cache()

        actual_port = port or self.config.get("server_port", 8080)
        status = {
            "running": running,
            "pid": pid,
            "port": actual_port,
            "model": model,
            "started_by": "Nunba",
            "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "projectPath": None,
            "projectName": "Nunba"
        }
        # Write to all known status file locations
        for status_path in [
            self.server_status_file,  # ~/.nunba/server_status.json
            Path.home() / ".trueflow" / "server_status.json",
        ]:
            try:
                status_path.parent.mkdir(parents=True, exist_ok=True)
                with open(status_path, 'w') as f:
                    json.dump(status, f, indent=2)
            except Exception as e:
                logger.debug(f"Failed to write status to {status_path}: {e}")

    def start_server(self, model_preset: ModelPreset | None = None, force_new_port: bool = False) -> bool:
        """
        Start the llama.cpp server with automatic port conflict resolution

        Args:
            model_preset: Model to load (uses selected model if None)
            force_new_port: Force finding a new port even if configured port is available

        Returns:
            True if server started successfully, False otherwise
        """
        # Prevent double start across processes/threads using a file lock.
        # Each code path (--setup-ai, app.py warm-up, /chat fallback) creates
        # its own LlamaConfig instance, so in-memory flags don't work.
        lock_file = self.config_dir / ".server_starting.lock"

        # Check if another process is already starting
        if lock_file.exists():
            try:
                lock_age = time.time() - lock_file.stat().st_mtime
                if lock_age < 120:  # lock is fresh (< 2 min)
                    logger.info(f"Server start already in progress (lock age: {lock_age:.0f}s) — waiting...")
                    for _ in range(120):
                        time.sleep(0.5)
                        if not lock_file.exists():
                            break
                        if self.is_llm_available():
                            logger.info("Server started by another process — reusing")
                            return True
                    if self.is_llm_available():
                        return True
                    logger.warning("Server start by another process timed out")
                    return False
                else:
                    logger.warning(f"Stale server lock ({lock_age:.0f}s old) — removing")
                    lock_file.unlink(missing_ok=True)
            except Exception:
                pass

        # Acquire lock
        try:
            lock_file.write_text(str(os.getpid()))
        except Exception:
            pass

        try:
            return self._do_start_server(model_preset, force_new_port)
        finally:
            try:
                lock_file.unlink(missing_ok=True)
            except Exception:
                pass

    def _do_start_server(self, model_preset=None, force_new_port=False):
        """Internal server start — called by start_server() with lock protection."""
        # #124/#134 — apply any queued llama.cpp binary upgrade BEFORE (re)start,
        # but ONLY when NO local llama-server is holding the (shared) binary.
        # Gate on check_server_running() (a real llama-server on the port), NOT
        # is_llm_available() — the latter returns True when a cloud API is
        # configured, which would skip the LOCAL binary swap forever.
        # Check EVERY managed port: the main server AND the :8081 caption/draft
        # server run from the same binary dir, so a swap while either is up
        # would fail the move-aside (Windows locks the running .exe).
        try:
            _main_port = self.config.get("server_port", 8080)
            _busy = self.check_server_running(_main_port) or self.check_server_running(8081)
            if self.config.get('pending_llama_swap') and not _busy:
                self.apply_pending_llama_upgrade()
        except Exception as _upg_err:
            logger.warning(f"[llama-upgrade] pending-apply check failed: {_upg_err}")
        # Get desired port
        desired_port = self.config.get("server_port", 8080)

        # Check desired port AND common llama.cpp ports for existing servers.
        # Avoids starting a second GPU server when trueflow/other already runs.
        _check_ports = [desired_port]
        for _common_port in [8080, 8081]:
            if _common_port != desired_port:
                _check_ports.append(_common_port)

        for _port in _check_ports:
            server_type, server_info = self.check_server_type(_port)

            if server_type in (ServerType.NUNBA_MANAGED, ServerType.EXTERNAL_LLAMA):
                label = "Nunba-managed" if server_type == ServerType.NUNBA_MANAGED else "External llama.cpp"
                logger.info(f"{label} server already running on port {_port}")
                self.api_base = f"http://127.0.0.1:{_port}/v1"
                self.config["server_port"] = _port
                self._propagate_llm_url(self.api_base)
                self._save_config()

                # Sync orchestrator catalog with the ACTUAL running model.
                # Query /v1/models to get the GGUF filename, then match against
                # MODEL_PRESETS (which map display_name ↔ file_name) and catalog.
                try:
                    import requests as _req
                    resp = _req.get(f"http://127.0.0.1:{_port}/v1/models", timeout=3)
                    if resp.status_code == 200:
                        rj = resp.json()
                        actual_gguf = (rj.get('data', [{}])[0].get('id', '')
                                       or rj.get('models', [{}])[0].get('name', ''))
                        logger.info(f"Running model: {actual_gguf}")

                        # Match GGUF filename to MODEL_PRESETS display name
                        # MODEL_PRESETS is already imported at module level (line 18)
                        display_name = actual_gguf  # fallback
                        try:
                            for p in MODEL_PRESETS:
                                if p.file_name == actual_gguf:
                                    display_name = p.display_name
                                    # Update config to reflect the actual running model
                                    idx = MODEL_PRESETS.index(p)
                                    if self.config.get('selected_model_index') != idx:
                                        self.config['selected_model_index'] = idx
                                        self._save_config()
                                    break
                        except ImportError:
                            pass

                        # Notify orchestrator so catalog marks it as loaded.
                        # device was the literal 'gpu'.  This is the "server
                        # already running" early return, which never learned how
                        # that server was launched -- and the same file has a
                        # real CPU-only path (:2690-2693) that sets
                        # config["use_gpu"]=False when the installed binary has
                        # no GPU support.  device feeds BOTH mark_loaded() (what
                        # the admin UI shows) and _register_vram(), so a
                        # CPU-resident model was also booked against VRAM.
                        #
                        # is_installed() must run FIRST: binary_supports_gpu is
                        # initialised False at llama_installer.py:206 and is only
                        # assigned by the probe (_binary_has_gpu_support, :427).
                        # Measured on this box, same process: reading the
                        # attribute cold gives False even on a GPU build;
                        # after is_installed() it gives True.  Reading it cold
                        # would mislabel GPU as CPU -- the inverse bug.
                        # Conditions mirror can_use_gpu at :2013.
                        try:
                            from models.orchestrator import get_orchestrator
                            self.installer.is_installed()   # populates the flag
                            _on_gpu = (
                                self.config.get("use_gpu", False) and
                                self.installer.gpu_available != "none" and
                                self.installer.binary_supports_gpu
                            )
                            _device = 'gpu' if _on_gpu else 'cpu'
                            get_orchestrator().notify_loaded(
                                'llm', display_name, device=_device)
                            logger.info(
                                f"Catalog synced: LLM '{display_name}' marked "
                                f"as loaded on {_device}")
                        except ImportError:
                            pass
                except Exception as _sync_err:
                    logger.debug(f"Catalog sync skipped: {_sync_err}")

                return True

        # Re-check the desired port — use raw TCP bind test to catch TIME_WAIT
        # phantom sockets that HTTP health checks miss.
        def _is_port_really_free(port):
            """Try to actually bind to the port. TIME_WAIT, phantom processes, etc. all fail."""
            import socket
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(('127.0.0.1', port))
                s.close()
                return True
            except OSError:
                return False

        port_free = _is_port_really_free(desired_port)
        server_type, server_info = self.check_server_type(desired_port)

        if server_type == ServerType.OTHER_SERVICE or force_new_port or not port_free:
            if server_type == ServerType.OTHER_SERVICE:
                logger.warning(f"Port {desired_port} is occupied by a non-llama.cpp service")
            elif not port_free:
                logger.warning(f"Port {desired_port} has phantom connections (TIME_WAIT) — finding alternative")

            # Find an available port (also uses bind test)
            new_port = None
            for _try_port in range(desired_port + 1, desired_port + 20):
                if _is_port_really_free(_try_port):
                    st, _ = self.check_server_type(_try_port)
                    if st == ServerType.NOT_RUNNING:
                        new_port = _try_port
                        break
            if new_port is None:
                new_port = self.find_available_port(start_port=desired_port + 1)
            if new_port is None:
                logger.error("Could not find an available port for llama.cpp server")
                return False

            logger.info(f"Using alternative port: {new_port}")
            # Update config with new port
            self.config["server_port"] = new_port
            self._save_config()
            self.api_base = f"http://127.0.0.1:{new_port}/v1"
            desired_port = new_port

        # Check if we have our own server process running
        if self.server_process and self.server_process.poll() is None:
            logger.info("Server process is already running")
            return True

        # Detect backend: zinc for AMD RDNA GPUs, llama.cpp for everything else
        _use_zinc = self.installer.gpu_available == 'zinc'
        if _use_zinc:
            try:
                from llama.zinc_installer import ZincInstaller
                _zinc = ZincInstaller()
                llama_server = _zinc.find_zinc_server()
                if not llama_server:
                    # Try to build zinc — push progress to SetupProgressCard
                    logger.info("Zinc not installed — building for AMD GPU...")
                    def _zinc_progress(downloaded, total, msg):
                        logger.info(f"Zinc: {msg}")
                        try:
                            from integrations.social.realtime import publish_event
                            publish_event('setup_progress', {
                                'type': 'setup_progress',
                                'job_type': 'zinc_amd',
                                'status': 'loading',
                                'message': msg,
                                'model_name': 'Zinc (AMD Vulkan)',
                            })
                        except Exception:
                            pass
                    if _zinc.install(progress_callback=_zinc_progress):
                        llama_server = _zinc.find_zinc_server()
                if llama_server:
                    logger.info(f"Using zinc (AMD Vulkan): {llama_server}")
                else:
                    logger.warning("Zinc build failed — falling back to llama.cpp")
                    _use_zinc = False
            except ImportError:
                logger.warning("zinc_installer not available — falling back to llama.cpp")
                _use_zinc = False

        if not _use_zinc:
            # Get llama-server path (check system installations first)
            llama_server = self.installer.find_llama_server(check_system_first=True)
            if not llama_server:
                logger.error("llama-server not found. Please install llama.cpp first.")
                return False

            # Log whether using system or Nunba installation
            if self.installer.is_system_installation(llama_server):
                logger.info(f"Using existing system llama.cpp installation: {llama_server}")
            else:
                logger.info(f"Using Nunba-managed llama.cpp installation: {llama_server}")

        # Get model from config (set by orchestrator via LlamaLoader or previous run).
        # Model selection is the orchestrator's job (ModelCatalog.select_best + VRAMManager).
        # start_server() only manages the llama-server process.
        if not model_preset:
            idx = self.config.get('selected_model_index', 0)
            if 0 <= idx < len(MODEL_PRESETS):
                model_preset = MODEL_PRESETS[idx]
            else:
                model_preset = MODEL_PRESETS[0]

        if not model_preset:
            logger.error("No model selected")
            return False

        model_path = self.installer.get_model_path(model_preset)
        if not model_path:
            # Model not on disk — try any downloaded model from presets
            logger.warning(f"Model not found: {model_preset.display_name} — scanning for alternatives")
            for i, preset in enumerate(MODEL_PRESETS):
                p = self.installer.get_model_path(preset)
                if p:
                    logger.info(f"Found downloaded model: {preset.display_name}")
                    model_preset = preset
                    model_path = p
                    self.config['selected_model_index'] = i
                    self._save_config()
                    break
            if not model_path:
                logger.error("No downloaded models found. Please download a model first.")
                return False

        # Check version compatibility for the selected model.
        #
        # The min_build floor is a RECOMMENDED build, not an absolute load
        # requirement: it exists to gate optional build-dependent features
        # like MTP / spec-ngram speculative decoding (added in HEVOLVE_LLAMA_
        # NGRAM_SPEC opt-in path below — verified b9180+ needed for
        # --spec-type ngram-* and --spec-ngram-* flags).  The model itself
        # still loads on lower builds; performance is only degraded for the
        # opt-in features.  Don't hard-block chat here — warn, suppress the
        # build-gated flags via self._suppress_build_gated_features so the
        # command-builder skips them, and proceed.  Auto-setup already
        # surfaced the upgrade path in diagnose() and tried try_download_
        # prebuilt(); if that failed we still get a working chat instead
        # of a dead one.
        self._suppress_build_gated_features = False
        if model_preset.min_build is not None:
            if not _use_zinc:
                # The binary was resolved BEFORE the preset was known (first-
                # existing wins, so a stale system/trueflow copy shadows a
                # freshly-upgraded Nunba-managed one). Now that we know the
                # model's min_build, re-resolve version-aware and switch if a
                # satisfying binary exists — this is what makes the #124
                # upgrade actually take effect instead of downloading an
                # unused copy.
                _best = self.installer.find_llama_server(
                    check_system_first=True, min_build=model_preset.min_build)
                if _best and _best != llama_server:
                    logger.info(
                        f"Switching llama-server for {model_preset.display_name}: "
                        f"{_best} (meets b{model_preset.min_build}+) over "
                        f"{llama_server}")
                    llama_server = _best
            is_ok, cur_ver, req_ver = self.installer.check_version_for_model(
                model_preset, llama_server
            )
            if not is_ok:
                logger.warning(
                    f"FALLBACK: llama.cpp build b{cur_ver} below recommended "
                    f"b{req_ver}+ for {model_preset.display_name}. Proceeding "
                    f"with installed binary; build-gated features (MTP / "
                    f"spec-ngram) will be suppressed for this session. "
                    f"Chat stays available (non-optimized). Auto-setup will "
                    f"retry upgrade on next launch when network is reachable."
                )
                self._suppress_build_gated_features = True

        # Resolution is final here (version-aware switching, if any, is done).
        # Record it as the one authority for "which binary is serving" so
        # diagnostics, the upgrade queue and update_llama_cpp all read the
        # same binary instead of each re-resolving first-existing and landing
        # on a different copy.  Reporting only — never gates an upgrade.
        self.installer.note_serving_binary(llama_server)

        # Build command — context size is VRAM-aware for Qwen3.5
        is_qwen35 = "Qwen3.5" in model_preset.display_name
        if is_qwen35:
            # Scale context with available VRAM:
            #   ≥6GB free → 16384 (full multi-turn agent conversations)
            #   ≥4GB free → 8192  (standard conversations)
            #   <4GB free → 4096  (compact, preserves VRAM for TTS/STT)
            # KV cache cost: ~1GB per 8K context for 4B Q4 model
            try:
                from integrations.service_tools.vram_manager import vram_manager
                free_gb = vram_manager.detect_gpu().get('free_gb', 0)
                model_gb = model_preset.size_mb / 1024.0
                remaining = free_gb - model_gb  # VRAM after model loads
                if remaining >= 3:
                    ctx_size = 16384
                elif remaining >= 2.0:
                    ctx_size = 8192
                else:
                    ctx_size = 4096
                logger.info(f"Dynamic context size: {ctx_size} "
                            f"(VRAM free={free_gb:.1f}GB, model={model_gb:.1f}GB, "
                            f"remaining={remaining:.1f}GB)")
            except Exception:
                ctx_size = 8192  # safe default
        else:
            ctx_size = self.config.get("context_size", 8192)

        # Cap context: 12K balances quality + VRAM for F5-TTS coexistence.
        # KV cache cost: ~1GB per 8K for 4B, ~0.5GB per 8K for 2B.
        # Raised from 10240→12288 (2026-05-15) after context-overflow
        # diagnosis (langchain.log 32× "Context size has been exceeded"
        # per session).  Companion fixes already in place: HARTOS
        # MessageTokenLimiter max_tokens=3500 (was 4000) + chat_instructor
        # added to context_handling.add_to_agent in 5 sites.  This +2K
        # ctx provides extra headroom for tool schemas (~3-5K tokens)
        # plus system prompt (~1.5K) on top of trimmed history.
        # Net KV cost at 12K: ~1.5GB for 4B Q4 — still leaves ~2GB for
        # F5-TTS / Indic Parler coexistence on the 8GB-VRAM laptop tier.
        ctx_size = min(ctx_size, 12288)

        # Cap threads to 75% of cores — leave headroom for OS + TTS
        max_threads = max(1, int((os.cpu_count() or 4) * 0.75))

        # ── Parallel slots: cap to avoid unified-KV exhaustion ──
        # llama-server defaults --parallel to "auto" and picked 4 slots on
        # the live box (llama_server_8080.log:8 "n_parallel is set to auto,
        # using n_parallel = 4 and kv_unified = true").  With kv_unified the
        # whole n_ctx (12288) is ONE shared KV pool across ALL slots — it is
        # NOT 12288 per slot.  Chat/agent prompts run ~4.4k tokens each
        # (witnessed task.n_tokens = 4433), so ≥3 concurrent ones (draft +
        # autogen experts + daemon) sum past 12288 and the server logs
        # "failed to find free space in the KV cache" → prompt truncation +
        # GPU thrash (~10 t/s) + HTTP 503 — i.e. the "no LLM response"
        # outage.  Cap parallel so the pool can't be over-subscribed:
        # default 2 (2 × 4.4k = 8.8k < 12288, with headroom) lets one chat
        # turn and one background autogen slot coexist.  Env-tunable via
        # HEVOLVE_LLAMA_PARALLEL (1 = max per-request ctx + serialize;
        # raise only on a box launched with a bigger --ctx-size budget).
        try:
            n_parallel = int(os.environ.get('HEVOLVE_LLAMA_PARALLEL', '')
                             or self.config.get('llama_parallel') or 2)
        except (TypeError, ValueError):
            n_parallel = 2
        n_parallel = max(1, min(n_parallel, 4))

        # Build server command — zinc uses simpler CLI than llama.cpp
        if _use_zinc:
            cmd = [llama_server, '-m', model_path, '-p', str(desired_port)]
            can_use_gpu = True  # zinc is GPU-only (Vulkan)
            logger.info(f"Zinc command: {' '.join(cmd)}")
        else:
            cmd = [
                llama_server,
                "--model", model_path,
                "--port", str(desired_port),
                "--ctx-size", str(ctx_size),
                "--threads", str(max_threads),
                # Explicit cap (see n_parallel above) — overrides llama.cpp's
                # "auto" (=4) that over-subscribed the shared kv_unified pool.
                "--parallel", str(n_parallel),
                "--host", "127.0.0.1",
                "--jinja",
                "--reasoning-format", "deepseek",
                "--reasoning-budget", "0",
                # ``--log-timestamps`` adds ``[HH:MM:SS.mmm]`` to every
                # log line llama-server emits.  Without it, the server
                # log has no clock — verified 2026-05-12 against the
                # 190 MB llama_server_8082.log which couldn't be
                # correlated with frozen_debug timestamps.  Audited via
                # ``llama-server --help`` — the flag is stable across
                # current llama.cpp builds.  Cheapest possible win for
                # ctx-overflow forensics.
                "--log-timestamps",
            ]

            # ── N-gram speculative decoding (no draft model needed) ──
            # The dual-model speculative path Nunba uses today (Qwen3-4B
            # main on :8082 + Qwen3-0.8B draft on :8081) eats ~700MB of
            # VRAM for the draft.  On tight cards (6GB) that pressure
            # forces TTS / vision evictions during chat.
            #
            # llama.cpp ships an alternative: ``--spec-ngram-*`` does
            # speculative decoding by predicting the next tokens from
            # ngram patterns in the current context — no second model,
            # no extra VRAM.  Gain is smaller than dual-model (~1.3-1.8x
            # vs the dual-model ~2x) but the VRAM cost is zero.
            #
            # Verified 2026-05-23 against the live binary at
            # C:\Users\sathi\.trueflow\llama.cpp\build\bin\Release\
            # llama-server.exe --help: ``--spec-ngram-size-n``,
            # ``--spec-ngram-size-m``, ``--spec-ngram-min-hits`` are all
            # present; the earlier ``--mtp-n`` flag I'd guessed at does
            # NOT exist in this build (Multi-Token Prediction requires
            # both newer llama.cpp + a model GGUF with MTP head
            # tensors — Qwen3.5-4B-UD-Q4_K_XL doesn't ship those).
            #
            # Toggle: ``$env:HEVOLVE_LLAMA_NGRAM_SPEC = "1"`` to enable.
            # Anything truthy enables; uses llama.cpp defaults for N/M.
            # When set alongside the dual-model draft (port 8081), the
            # dual-model takes precedence inside llama-server; clearing
            # ``HEVOLVE_DRAFT_FIRST`` makes ngram the active path.
            _ngram_spec = (os.environ.get('HEVOLVE_LLAMA_NGRAM_SPEC', '')
                           or '').strip().lower()
            if _ngram_spec in ('1', 'true', 'yes', 'on') and not getattr(
                    self, '_suppress_build_gated_features', False):
                # ``--spec-type`` MUST be set to one of the ngram-*
                # variants for the size flags to take effect — without
                # it the binary defaults to ``none`` and silently
                # ignores the rest.  Re-verified 2026-05-23 against
                # the live binary: valid values are
                # ``ngram-cache|ngram-simple|ngram-map-k|ngram-map-k4v|
                # ngram-mod``.  ``ngram-map-k`` is the default-balanced
                # choice for chat workloads.
                #
                # ``_suppress_build_gated_features`` is True when the
                # installed llama.cpp build is below model_preset.min_build
                # (set in the version-check warn-and-proceed path above).
                # The ngram-spec flags need b9180+; skipping them keeps
                # chat available on the older binary while auto-setup
                # retries the upgrade in the background.
                cmd.extend([
                    "--spec-type", "ngram-map-k",
                    "--spec-ngram-size-n", "3",
                    "--spec-ngram-size-m", "4",
                    "--spec-ngram-min-hits", "1",
                ])
            elif _ngram_spec in ('1', 'true', 'yes', 'on'):
                logger.warning(
                    "FALLBACK: HEVOLVE_LLAMA_NGRAM_SPEC requested but "
                    "installed llama.cpp build does not support it; "
                    "starting without speculative-decoding flags."
                )
                logger.info(
                    "[SPEC-NGRAM] Enabling n-gram speculative decoding "
                    "(--spec-type ngram-map-k) — opt-in via "
                    "HEVOLVE_LLAMA_NGRAM_SPEC.  No draft model needed; "
                    "~1.5x first-token speedup on chat patterns with "
                    "no extra VRAM cost."
                )

            # ── Multi-Token Prediction (MTP) — needs newer binary ──
            # MTP support landed in llama.cpp PR #22673 (am17an).  Local
            # binary at C:\Users\sathi\.trueflow\llama.cpp\build\bin\
            # Release\ predates that PR — verified 2026-05-23 against
            # --help (--spec-type choices do NOT include `mtp`).  When
            # the binary is upgraded, set this env var to enable real
            # MTP:
            #   $env:HEVOLVE_LLAMA_MTP_N = "3"
            # which appends:
            #   --spec-type mtp --spec-draft-n-max 3
            # Qwen3.5-4B-UD-Q4_K_XL (the current model) ships with the
            # MTP head exposed in checkpoint config — confirmed by the
            # llama.cpp + Qwen3.5 / Qwen3.6 community guides.
            try:
                _mtp_n = int(os.environ.get('HEVOLVE_LLAMA_MTP_N', '0') or '0')
            except (TypeError, ValueError):
                _mtp_n = 0
            if _mtp_n >= 1:
                cmd.extend([
                    "--spec-type", "mtp",
                    "--spec-draft-n-max", str(_mtp_n),
                ])
                logger.info(
                    "[MTP] Enabling Multi-Token Prediction (--spec-type "
                    "mtp --spec-draft-n-max %d) — opt-in via "
                    "HEVOLVE_LLAMA_MTP_N.  Requires llama.cpp built "
                    "after PR #22673.  If llama-server rejects the "
                    "flag, the local binary is too old; rebuild it "
                    "or unset the env var.",
                    _mtp_n,
                )

            # Qwen3.5 models need additional flags
            if is_qwen35:
                cmd.extend([
                    "--temp", "0.7",
                    "--top-k", "20",
                    "--top-p", "0.95",
                    "--no-context-shift",
                ])

            # Auto-enable use_gpu when binary and hardware both support it
            if (self.installer.binary_supports_gpu and
                    self.installer.gpu_available != "none" and
                    not self.config.get("use_gpu", False)):
                logger.info("Auto-enabling GPU: binary supports it and GPU is available")
                self.config["use_gpu"] = True
                self._save_config()

            can_use_gpu = (
                self.config.get("use_gpu", False) and
                self.installer.gpu_available != "none" and
                self.installer.binary_supports_gpu
            )

            # Add vision model flags
            if model_preset.has_vision:
                cmd.append("--kv-unified")
                mmproj_path = self.installer.get_mmproj_path(model_preset)
                if mmproj_path:
                    cmd.extend(["--mmproj", mmproj_path])
                if not can_use_gpu:
                    cmd.append("--no-mmproj-offload")

            if can_use_gpu:
                if self.installer.gpu_available == "cuda":
                    cmd.extend(["-ngl", "99"])
                    cmd.extend(["--flash-attn", "on"])
                    logger.info("GPU acceleration enabled (CUDA + flash-attn)")
                elif self.installer.gpu_available == "metal":
                    logger.info("GPU acceleration enabled (Metal)")
            else:
                if self.config.get("use_gpu", False) and not self.installer.binary_supports_gpu:
                    logger.warning("GPU requested but binary doesn't support it - using CPU")
                logger.info("Using CPU-only mode")

        try:
            logger.info(f"Starting server on port {desired_port}: {' '.join(cmd)}")

            # Start the server process.
            # startupinfo ONLY, deliberately — this spawn previously built its
            # own STARTUPINFO inline and passed no creationflags, and llama-server
            # is a long-lived child on the chat hot path, so this de-duplication
            # must not change its spawn semantics.  Taking only the startupinfo
            # keeps behaviour byte-identical while removing the copy.  (Two of the
            # eleven copies found 2026-08-11 diverged exactly here: some passed
            # CREATE_NO_WINDOW, these did not — which is what duplication does.)
            from desktop.platform_utils import get_subprocess_flags
            startupinfo = get_subprocess_flags().get('startupinfo')

            # Set cwd to binary dir so DLLs (ggml-cuda.dll, mtmd.dll) are found
            bin_dir = str(Path(llama_server).parent)
            # llama_child_env: os.environ.copy() + thinking-off (task #652).
            env = llama_child_env()
            env["PATH"] = bin_dir + os.pathsep + env.get("PATH", "")
            # Zinc (AMD Vulkan) needs RADV cooperative matrix for RDNA4
            if _use_zinc:
                env["RADV_PERFTEST"] = "coop_matrix"

            # Capture llama-server stdout/stderr to a dedicated log file
            # so diagnostics survive the process death.  Previously stdout
            # was subprocess.PIPE which (a) only got drained during the
            # startup loop, leaving the buffer to fill and BLOCK the
            # server after start_server() returned, (b) lost all
            # post-mortem context on external death (CUDA crash, OOM).
            # See task #80 — the silent-crash investigation that
            # surfaced this gap.
            _llama_log_dir = os.path.join(
                os.path.expanduser('~'), 'Documents', 'Nunba', 'logs'
            )
            try:
                os.makedirs(_llama_log_dir, exist_ok=True)
            except Exception:
                _llama_log_dir = bin_dir  # fallback to binary dir
            _llama_log_path = os.path.join(
                _llama_log_dir, f'llama_server_{desired_port}.log'
            )
            # Append-mode preserves history across restarts.  Write a
            # session-start banner so a tail can locate the current run.
            try:
                _rotate_log_if_oversized(_llama_log_path)  # PERF-2: bound at spawn (across restarts)
                _llama_log_fh = open(_llama_log_path, 'ab')
                _banner = (
                    f"\n===== {time.strftime('%Y-%m-%dT%H:%M:%S')} "
                    f"llama-server start port={desired_port} "
                    f"model={model_preset.display_name} =====\n"
                ).encode()
                _llama_log_fh.write(_banner)
                _llama_log_fh.flush()
                logger.info(
                    f"llama-server stdout/stderr → {_llama_log_path}"
                )
            except Exception as _log_err:
                logger.warning(
                    f"Could not open llama-server log file at "
                    f"{_llama_log_path}: {_log_err} — falling back to DEVNULL"
                )
                _llama_log_fh = subprocess.DEVNULL
                _llama_log_path = None

            self.server_process = subprocess.Popen(
                cmd,
                stdout=_llama_log_fh,
                stderr=subprocess.STDOUT,  # merge into same file
                cwd=bin_dir,
                env=env,
                startupinfo=startupinfo,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            )
            # Close our handle on the file — the subprocess holds its own
            # inherited handle.  Keeping ours open just leaks an FD per
            # restart.  DEVNULL is a sentinel; nothing to close.
            if _llama_log_fh is not subprocess.DEVNULL:
                try:
                    _llama_log_fh.close()
                except Exception:
                    pass

            # Wait for server to be ready.  We no longer drain stdout
            # in-process — the OS routes it to the dedicated log file
            # (above), so the buffer can never fill up and block the
            # server.  Liveness is detected via check_server_running()
            # (HTTP /health).
            timeout_seconds = 120 if model_preset.has_vision else 60
            start_time = time.time()
            logger.info(f"Waiting for server to start (timeout: {timeout_seconds}s)...")

            def _read_log_tail(n_bytes: int = 2000) -> str:
                """Return the last n_bytes of the llama-server log for
                diagnostic output.  Used when the process dies during
                startup so the operator sees WHY without grepping a
                separate file.  Bounded read; non-fatal."""
                if not _llama_log_path:
                    return ''
                try:
                    with open(_llama_log_path, 'rb') as _diag:
                        _diag.seek(0, 2)
                        _size = _diag.tell()
                        _diag.seek(max(0, _size - n_bytes))
                        return _diag.read().decode('utf-8', errors='replace')
                except Exception:
                    return ''

            while time.time() - start_time < timeout_seconds:
                # Check if process died early
                if self.server_process.poll() is not None:
                    logger.error("llama-server process died during startup")
                    _tail = _read_log_tail(2000)
                    if _tail:
                        logger.error(f"Server output (tail):\n{_tail}")
                    return False

                # Check health endpoint
                if self.check_server_running(desired_port):
                    elapsed = time.time() - start_time
                    logger.info(f"Server started successfully on port {desired_port} (took {elapsed:.1f}s)")
                    self._write_server_status(True, self.server_process.pid, model_preset.display_name)
                    # Propagate LLM URL to env so HARTOS resolves the correct endpoint
                    self.api_base = f'http://127.0.0.1:{desired_port}/v1'
                    self._propagate_llm_url(self.api_base)
                    # Register VRAM allocation — canonical key 'llm', idempotent
                    if can_use_gpu:
                        vm = self._get_vram_manager()
                        if vm:
                            model_gb = model_preset.size_mb / 1024.0
                            vm._allocations['llm'] = model_gb
                            logger.info(f"VRAM allocation registered: llm = {model_gb:.1f}GB")
                    # Quick benchmark — warm up the KV cache and measure t/s
                    try:
                        import urllib.request
                        _bench_body = json.dumps({
                            "model": "local",
                            "messages": [{"role": "user", "content": "Count from 1 to 10:"}],
                            "max_tokens": 30, "temperature": 0.1, "stream": False
                        }).encode()
                        _bench_req = urllib.request.Request(
                            f"http://127.0.0.1:{desired_port}/v1/chat/completions",
                            data=_bench_body, method='POST',
                            headers={"Content-Type": "application/json"})
                        _t0 = time.time()
                        with urllib.request.urlopen(_bench_req, timeout=30) as _br:
                            _bench_resp = json.loads(_br.read())
                        _t1 = time.time()
                        _usage = _bench_resp.get("usage", {})
                        _compl_tokens = _usage.get("completion_tokens", 0)
                        _tps = _compl_tokens / max(_t1 - _t0, 0.01)
                        _mode = 'GPU' if can_use_gpu else 'CPU'
                        logger.info(
                            f"Quick benchmark: {_compl_tokens} tokens in "
                            f"{_t1 - _t0:.1f}s = {_tps:.1f} t/s "
                            f"({model_preset.display_name}, {_mode})")
                    except Exception as _bench_err:
                        logger.debug(f"Quick benchmark skipped: {_bench_err}")
                    return True

                # Log progress every 10 seconds
                elapsed = time.time() - start_time
                if int(elapsed) % 10 == 0 and int(elapsed) > 0 and elapsed - int(elapsed) < 0.6:
                    logger.info(f"Still waiting for server... ({int(elapsed)}s/{timeout_seconds}s)")

                time.sleep(0.5)

            logger.error(f"Server failed to start within timeout ({timeout_seconds}s)")
            logger.error("Run 'python test_server_debug.py' to see server output")
            self.stop_server()
            return False

        except Exception as e:
            logger.error(f"Failed to start server: {e}")
            return False

    # ── Caption Server (0.8B VLM for continuous frame captioning) ──

    def start_caption_server(self, port: int = 8081) -> bool:
        """Start the 0.8B caption server alongside the main LLM server.

        Lazy-started by HARTOS VisionService on first camera/screen frame.
        Uses the same llama-server binary, model download, and mmproj
        handling as the main server — just a smaller model on a different port.

        Args:
            port: Caption server port (default 8081, via HEVOLVE_VLM_CAPTION_PORT)

        Returns:
            True if server started and healthy
        """
        import os
        port = int(os.environ.get('HEVOLVE_VLM_CAPTION_PORT', port))

        # Already running?
        if self.check_server_running(port):
            logger.info(f"Caption server already running on port {port}")
            return True

        # Find the 0.8B preset
        preset = None
        for p in MODEL_PRESETS:
            if '0.8B' in p.display_name:
                preset = p
                break
        if not preset:
            logger.error("No 0.8B model preset found")
            return False

        # Ensure model + mmproj downloaded
        model_path = self.installer.get_model_path(preset)
        if not model_path:
            logger.info(f"Downloading {preset.display_name}...")
            self.installer.download_model(preset)
            model_path = self.installer.get_model_path(preset)
        if not model_path:
            logger.error(f"Caption model not found: {preset.file_name}")
            return False

        mmproj_path = None
        if preset.has_vision and preset.mmproj_file:
            mmproj_path = self.installer.get_mmproj_path(preset)
            if not mmproj_path:
                self._download_mmproj_only(preset)
                mmproj_path = self.installer.get_mmproj_path(preset)

        # Build command — same pattern as start_server but with caption-optimized flags.
        # NOTE: the installer exposes find_llama_server(), NOT get_binary_path().
        # The old caption path invented that method name and crashed at boot with
        # AttributeError, which meant the draft 0.8B never came up and HARTOS's
        # draft-first dispatcher silently fell through to the 4B main model for
        # every request. Use the same resolver the main start_server calls.
        # Version-aware, same as the main start_server path (which the comment
        # above promises).  Resolving preset-blind here spawned the draft on a
        # first-existing binary while the main model ran on a version-aware
        # pick — two different llama.cpp builds serving in one app.
        binary_path = self.installer.find_llama_server(
            check_system_first=True,
            min_build=getattr(preset, 'min_build', None))
        if not binary_path:
            logger.error(
                "llama-server binary not found by installer.find_llama_server() — "
                "draft caption server cannot start. Run the main LLM setup first "
                "or call installer.install_llama_cpp() to provision the binary."
            )
            return False

        cmd = [str(binary_path), "--model", str(model_path),
               "--port", str(port), "--ctx-size", "2048",
               "--threads", "4"]
        if mmproj_path:
            cmd.extend(["--mmproj", str(mmproj_path), "--kv-unified"])
        can_use_gpu = (self.config.get("use_gpu", True) and
                       self.installer.binary_supports_gpu)
        if can_use_gpu:
            if self.installer.gpu_available == "cuda":
                cmd.extend(["-ngl", "99", "--flash-attn", "on"])
            if mmproj_path and not can_use_gpu:
                cmd.append("--no-mmproj-offload")

        # Start.
        # startupinfo ONLY — same reasoning as the main-server spawn above: the
        # caption/draft server is long-lived, so de-duplicating must not alter
        # its spawn semantics.  Note this copy used `subprocess.SW_HIDE` while
        # the other used the literal 0 for the same field; identical values,
        # different spellings, which is how a reader loses confidence that the
        # copies agree.
        from desktop.platform_utils import get_subprocess_flags
        startupinfo = get_subprocess_flags().get('startupinfo')

        log_path = self.config_dir / "caption_server.log"
        try:
            # APPEND mode — caption-server (0.8B draft) restarts across
            # bundle updates, crashes, idle-evictions.  Truncating on
            # each spawn erased the prior crash's log, which is exactly
            # when a human needed it.  Root-cause class: truncate-on-
            # restart log loss.  See Stage-A Symptom #8, 2026-04-16.
            log_fh = open(log_path, 'a')
            try:
                import datetime as _cap_dt
                log_fh.write(
                    f"\n===== caption_server session {_cap_dt.datetime.now().isoformat()} =====\n"
                )
                log_fh.flush()
            except Exception:
                pass
            # CREATE_NO_WINDOW is required on Windows for truly headless
            # launch of a console-subsystem binary (llama-server.exe).
            # Without it, a cmd window briefly flashes during splash.
            # startupinfo SW_HIDE alone is NOT enough for console apps.
            _creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            # env: this spawn previously passed no ``env=`` and inherited the
            # parent's, so it silently MISSED the thinking-off setting the main
            # server gets — the >10GB tier's separate 0.8B draft server would
            # have kept the task #652 defect.  ``llama_child_env()`` IS
            # os.environ.copy() plus that one key, so the inherited
            # environment is otherwise byte-identical and the spawn semantics
            # the comment above protects are unchanged.
            self._caption_process = subprocess.Popen(
                cmd, stdout=log_fh, stderr=subprocess.STDOUT,
                env=llama_child_env(),
                startupinfo=startupinfo,
                creationflags=_creationflags,
            )
            self._caption_log_fh = log_fh

            logger.info(f"Caption server starting: PID={self._caption_process.pid} "
                        f"port={port} model={preset.display_name}")

            # Wait for health
            start_time = time.time()
            while time.time() - start_time < 30:
                time.sleep(1)
                if self.check_server_running(port):
                    elapsed = time.time() - start_time
                    logger.info(f"Caption server ready on port {port} ({elapsed:.1f}s)")
                    self._write_caption_status(True, self._caption_process.pid,
                                               preset.display_name, port)
                    return True

            logger.warning(f"Caption server not healthy after 30s — check {log_path}")
            return False
        except Exception as e:
            logger.error(f"Caption server start failed: {e}")
            return False

    def stop_caption_server(self):
        """Stop the caption server and free GPU memory."""
        proc = getattr(self, '_caption_process', None)
        if proc:
            try:
                proc.terminate()
                proc.wait(timeout=5)
                logger.info(f"Caption server stopped (PID={proc.pid})")
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
            self._caption_process = None
            # Close log handle
            fh = getattr(self, '_caption_log_fh', None)
            if fh:
                try:
                    fh.close()
                except Exception:
                    pass
                self._caption_log_fh = None
            self._write_caption_status(False)
            # Release VRAM
            vm = self._get_vram_manager()
            if vm:
                freed = vm._allocations.pop('vlm_caption', 0)
                if freed:
                    logger.info(f"Released VRAM: vlm_caption = {freed:.1f}GB")

    def _write_caption_status(self, running: bool, pid: int | None = None,
                              model: str | None = None, port: int = 8081):
        """Write caption server status for cross-app coordination."""
        status = {
            "running": running,
            "pid": pid,
            "port": port,
            "model": model,
            "started_by": "Nunba",
            "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        for status_path in [
            self.config_dir / "caption_server_status.json",
            Path.home() / ".trueflow" / "caption_server_status.json",
        ]:
            try:
                status_path.parent.mkdir(parents=True, exist_ok=True)
                with open(status_path, 'w') as f:
                    json.dump(status, f, indent=2)
            except Exception:
                pass

    def stop_server(self):
        """Stop the llama.cpp server and release VRAM allocation."""
        if self.server_process:
            try:
                self.server_process.terminate()
                self.server_process.wait(timeout=5)
                logger.info("Server stopped")
            except Exception as e:
                logger.error(f"Failed to stop server gracefully: {e}")
                try:
                    self.server_process.kill()
                except Exception:
                    pass
            finally:
                self.server_process = None
                self._write_server_status(False)
                # Release VRAM allocation so TTS/vision can reclaim the space
                vm = self._get_vram_manager()
                if vm:
                    freed = vm._allocations.pop('llm', 0)
                    if freed:
                        logger.info(f"Released VRAM allocation: llm = {freed:.1f}GB")

    def queue_llama_upgrade(self) -> dict:
        """Stage a llama.cpp binary upgrade to the latest GitHub release.

        We do NOT swap the binary live.  The running llama-server (usually started
        by a DIFFERENT process during warm-up, so this instance has no
        ``server_process`` handle to stop) holds ``llama-server.exe`` open — on
        Windows you can't overwrite a running binary — and ``update_llama_cpp``
        deletes the old build before downloading.  So we just set a
        ``pending_llama_swap`` flag; ``apply_pending_llama_upgrade`` runs it at the
        next boot, before any server starts (file unlocked, single startup owner).

        Returns {queued, current_build, message}.  Instant + side-effect-free
        beyond the flag, so it's safe to call from the /api/llm/upgrade endpoint
        or the self-heal coding agent.
        """
        try:
            cur = self.installer.get_version()
        except Exception:
            cur = None
        self.config["pending_llama_swap"] = True
        self._save_config()
        logger.info(f"[llama-upgrade] queued (current b{cur}) — applies on next restart")
        return {
            "queued": True,
            "current_build": cur,
            "message": "Upgrade will download and apply on next restart. Restart Nunba to apply.",
        }

    def apply_pending_llama_upgrade(self, progress_callback=None) -> bool:
        """Apply a queued llama.cpp upgrade at boot — call BEFORE the server starts.

        No-op unless ``pending_llama_swap`` is set.  Runs ``update_llama_cpp``
        while no server is running (binary unlocked).  Clears the flag whether the
        download succeeds or fails: a failed download falls through to the normal
        first-run setup, which re-installs, so a bad release can never wedge boot
        in a retry loop.  Returns True only on a successful swap.
        """
        if not self.config.get("pending_llama_swap"):
            return False

        def _report(msg):
            logger.info(f"[llama-upgrade] {msg}")
            if progress_callback:
                try:
                    progress_callback(msg)
                except Exception:
                    pass

        _report("Applying queued llama.cpp upgrade before server start...")
        ok = False
        try:
            ok = self.installer.update_llama_cpp(progress_callback=_report)
            _report("Upgrade applied." if ok else "Upgrade download failed — keeping existing setup.")
        except Exception as e:
            _report(f"Upgrade failed: {e} — will fall back to normal setup")
        finally:
            self.config["pending_llama_swap"] = False
            self._save_config()
        return ok

    def switch_model(self, model_index: int) -> bool:
        """
        Switch to a different model at runtime. Stops current server and restarts.

        Args:
            model_index: Index into MODEL_PRESETS (0-5)

        Returns:
            True if server restarted successfully with new model
        """
        if model_index < 0 or model_index >= len(MODEL_PRESETS):
            logger.error(f"Invalid model index: {model_index}. Valid: 0-{len(MODEL_PRESETS)-1}")
            return False

        preset = MODEL_PRESETS[model_index]
        model_path = self.installer.get_model_path(preset)
        if not model_path:
            logger.error(f"Model not downloaded: {preset.display_name}")
            return False

        logger.info(f"Switching to model: {preset.display_name}")
        self.stop_server()

        # Update config
        self.config["selected_model_index"] = model_index
        self._save_config()

        return self.start_server(model_preset=preset)

    def get_current_model_name(self) -> str:
        """Get the display name of the currently selected model."""
        preset = self.get_selected_model_preset()
        return preset.display_name if preset else "unknown"

    def chat_completion(self, messages: list[dict], temperature: float = 0.7,
                       max_tokens: int = 1000) -> str | None:
        """
        Send a chat completion request to the server

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Generated text or None if failed
        """
        if not self.check_server_running():
            logger.error("Server is not running")
            return None

        try:
            response = requests.post(
                f"{self.api_base}/chat/completions",
                json={
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                timeout=60
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content")
            else:
                logger.error(f"Chat completion failed: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Chat completion error: {e}")
            return None


def initialize_llama_on_first_run(progress_callback=None, force_install=False) -> bool:
    """
    Check AI configuration at runtime.

    At install time, --setup-ai handles scanning and user consent for downloads.
    At runtime, this function:
    1. If already configured (first_run=False): return True
    2. If not configured: scan for endpoints (no downloads without consent)
    3. If endpoint found: auto-configure and use it
    4. If nothing found: return False (AI unavailable)

    Args:
        progress_callback: Optional callback for progress updates
        force_install: If True, install llama.cpp (only use with explicit user consent)

    Returns:
        True if AI is available, False otherwise
    """
    config = LlamaConfig()

    # Check if already configured
    if not config.is_first_run():
        logger.info("AI already configured, skipping initialization")
        return True

    # Check if external endpoint is already configured
    if config.config.get("use_external_llm") and config.config.get("external_llm_endpoint"):
        logger.info("External LLM endpoint configured")
        return True

    # Check if local llama is already installed
    installer = LlamaInstaller()
    _existing_binary = installer.find_llama_server()
    if _existing_binary:
        # Nothing to download — but deliberately DO NOT mark_first_run_complete()
        # here.  Finding a binary means "no install needed"; it does not mean the
        # user has been onboarded, and this function runs on EVERY boot while
        # first_run is true (app.py:9605 gates the AI-init thread on it).
        #
        # It used to clear the flag, which made first_run unsettable by hand:
        # set it true, launch, and this line reverted it before the wizard gate
        # at app.py:3026 ever read it.  find_llama_server() also searches paths
        # Nunba does not own — on the machine that reported this it returned
        # ~/.trueflow/llama.cpp/.../llama-server.exe, another product's build —
        # so "setup is complete" was being concluded from a foreign install.
        #
        # Note the asymmetry that makes this a defect rather than a preference:
        # the CONSUMER of first_run=False (app.py:3026) demands binary AND
        # (model OR custom_api) AND already-configured.  Clearing it on the
        # binary alone made this producer strictly more permissive than its own
        # consumer.  The flag is still cleared by the two producers that
        # represent real completion — llama_config.py:1127 (a model was selected
        # and applied) and app.py:3888 (an external endpoint was configured).
        logger.info(f"Local llama.cpp already installed at {_existing_binary} — "
                    "no download needed (first_run left as-is; setup completion "
                    "is recorded when a model or endpoint is actually chosen)")
        return True

    logger.info("First run - scanning for AI services...")

    if progress_callback:
        progress_callback("Scanning for AI services...")

    # Scan for existing LLM endpoints (no downloads at runtime without consent)
    existing_endpoint = scan_existing_llm_endpoints()
    if not existing_endpoint:
        existing_endpoint = scan_openai_compatible_ports()

    if existing_endpoint:
        logger.info(f"Found existing LLM endpoint: {existing_endpoint['name']}")
        if progress_callback:
            progress_callback(f"Found: {existing_endpoint['name']}")

        # Auto-configure the found endpoint so the LLM is usable / autostarts.
        # Deliberately NOT mark_first_run_complete(): detection answers "can we
        # serve?", first_run answers "has this installation been onboarded?".
        # Fusing them let a boot-time probe silently overwrite an explicit
        # first_run=true, so the wizard could never be re-triggered by hand.
        #
        # "the endpoint is probably our own llama-server anyway" does not hold
        # for THIS branch: it sets use_external_llm=True, i.e. it exists
        # precisely for servers Nunba did NOT start (Ollama, LM Studio, a stray
        # :8080). _save_config() below still persists the endpoint, so the
        # capability is configured either way — only the onboarding flag is
        # left to its rightful owners: auto_setup() (llama_config.py:1127, via
        # the POST route main.py:1929) and the wizard (app.py:3888), both of
        # which represent a real user action.
        config.config["external_llm_endpoint"] = existing_endpoint
        config.config["use_external_llm"] = True
        config._save_config()

        logger.info(f"Auto-configured external LLM: {existing_endpoint['base_url']}")
        return True

    # No existing endpoints found
    logger.info("No AI services found. AI features will be unavailable.")
    if progress_callback:
        progress_callback("No AI services found")

    # Only install if explicitly requested (with user consent)
    if force_install:
        logger.info("Force install requested - installing Llama.cpp...")
        if progress_callback:
            progress_callback("Installing local AI...")

        def install_progress(msg):
            logger.info(msg)
            if progress_callback:
                progress_callback(msg)

        if not installer.install_llama_cpp(install_progress):
            logger.error("Failed to install llama.cpp")
            return False

        # Update GPU config based on what was actually installed
        if installer.binary_supports_gpu:
            logger.info("Enabling GPU acceleration (binary supports it)")
            config.config["use_gpu"] = True
        else:
            logger.info("GPU acceleration disabled (binary is CPU-only)")
            config.config["use_gpu"] = False

        # Clear any external LLM settings since we're using local
        config.config["use_external_llm"] = False
        config.config.pop("external_llm_endpoint", None)
        config._save_config()

        # Download default model
        preset = MODEL_PRESETS[config.config.get("selected_model_index", 0)]

        if installer.is_model_downloaded(preset):
            logger.info(f"Model already downloaded: {preset.display_name}")
            config.mark_first_run_complete()
            return True

        def download_progress(downloaded_mb, total_mb, status):
            logger.info(status)
            if progress_callback:
                progress_callback(status)

        if installer.download_model(preset, download_progress):
            logger.info(f"Model downloaded successfully: {preset.display_name}")
            config.mark_first_run_complete()
            return True
        else:
            logger.error("Failed to download model")
            return False

    # No AI available (user skipped setup and no external endpoints found)
    return False


def get_active_llm_endpoint() -> dict | None:
    """
    Get the currently active LLM endpoint (external or local).

    Returns:
        Dict with endpoint info: {"name", "base_url", "completions", "type"}
        or None if no endpoint is configured/available
    """
    config = LlamaConfig()

    # Check if using external endpoint
    if config.config.get("use_external_llm") and config.config.get("external_llm_endpoint"):
        endpoint = config.config["external_llm_endpoint"]

        # Verify it's still available
        try:
            health_url = endpoint["base_url"] + "/v1/models"
            # For Ollama, use different endpoint
            if endpoint.get("type") == "ollama":
                health_url = endpoint["base_url"] + "/api/tags"

            response = requests.get(health_url, timeout=2)
            if response.status_code == 200:
                return endpoint
        except Exception:
            pass

        # External endpoint not available, fall back to local
        logger.warning(f"External endpoint {endpoint['name']} not available")

    # Use local llama.cpp endpoint — prefer the port the last health
    # probe found alive (orchestrator-assigned, e.g. 8082) over the
    # stale config default (8080).  See `_find_live_llama_port()` for
    # the shared probe.  Regression captured 2026-05-14 (RequestID
    # 30b02e45): server bound on 8082, get_llama_endpoint returned
    # 8080 from cached config — every chat → connection refused →
    # "Starting AI engine" stub returned to UI on a 30s loop.
    port = _find_live_llama_port() or config.config.get("server_port", 8080)
    return {
        "name": "Nunba Local AI",
        "base_url": f"http://localhost:{port}",
        "completions": f"http://localhost:{port}/v1/completions",
        "type": "openai"
    }


_cached_config = None
# Module-level: last port observed responding to /health, populated by
# _find_live_llama_port().  Lets get_llama_endpoint() agree with
# check_llama_health() about which port to talk to (the SEND side now
# matches the probe side — previously they diverged when the
# orchestrator started llama-server on a non-default port).
_last_healthy_llama_port: int | None = None

def _get_cached_config():
    """Return a module-level LlamaConfig singleton to avoid repeated GPU detection."""
    global _cached_config
    if _cached_config is None:
        _cached_config = LlamaConfig()
    return _cached_config


# Short TTL for the port-scan result.  Deliberately small: this is a LIVENESS
# probe, so a stale "alive" is worse than a redundant scan.  3s collapses the
# per-model storm below while still noticing a dead llama within one UI refresh.
_LLAMA_PORT_TTL_S = 3.0
# None means "never probed".  NOT 0.0: time.monotonic() is uptime-based, so on a
# freshly-booted box it can itself be < _LLAMA_PORT_TTL_S, and `now - 0.0` would
# then look like a fresh cache entry — the first call would return the initial
# None without ever hitting the network.
_llama_port_probed_at: float | None = None
_llama_port_cached: int | None = None


def invalidate_llama_port_cache() -> None:
    """Force the next liveness probe to hit the network.

    Call after anything that changes whether a llama-server is listening —
    `_write_server_status` does this for both spawn and stop.  Tests that mock
    `requests.get` also need it, because a preceding unmocked call can leave a
    real result cached inside the TTL.
    """
    global _llama_port_probed_at
    _llama_port_probed_at = None


def _find_live_llama_port(force: bool = False) -> int | None:
    """Probe known llama.cpp ports (config + 8082/8081/8080) and return
    the FIRST one whose /health answers 200.  Single source of truth for
    "which port is live".  Result is cached for _LLAMA_PORT_TTL_S.

    Args:
        force: skip the cache and re-probe (use after start/stop of a server).

    Returns:
        Port number (int) if any responds, else None.

    PERF (task #597, profiled 2026-08-03): this used to re-scan on EVERY call
    and had no cache — `_last_healthy_llama_port` was written but never read
    back.  models/orchestrator.LlamaLoader.is_loaded() calls it once PER MODEL,
    and model_orchestrator.get_status() loops every catalog entry, so
    GET /api/admin/models paid the full scan N times.  With 8081 and 8082 shut,
    each scan burns two 1s timeouts before reaching the live 8080 — measured
    22s for one request (py-spy caught all three samples parked in
    create_connection under _find_live_llama_port).

    Two other costs fixed here:
      * `localhost` -> `127.0.0.1`.  On Windows localhost resolves to ::1 AND
        127.0.0.1; a closed port can burn the whole timeout on the IPv6 attempt
        before falling back.  Pinning IPv4 skips that.
      * timeout 1s -> 0.4s.  This is loopback; a llama-server that has not
        accepted a connection in 400ms is not "just slow".

    NEGATIVE results are cached too — otherwise a fully-stopped llama (the worst
    case, all four ports dead) still pays 4 timeouts per model.
    """
    global _last_healthy_llama_port, _llama_port_probed_at, _llama_port_cached
    now = time.monotonic()
    if (not force and _llama_port_probed_at is not None
            and (now - _llama_port_probed_at) < _LLAMA_PORT_TTL_S):
        return _llama_port_cached

    config = _get_cached_config()
    config_port = config.config.get("server_port", 8080)
    found: int | None = None
    for _port in dict.fromkeys([config_port, 8082, 8081, 8080]):
        try:
            response = requests.get(
                f"http://127.0.0.1:{_port}/health", timeout=0.4)
            if response.status_code == 200:
                _last_healthy_llama_port = _port
                found = _port
                break
        except Exception:
            continue

    _llama_port_cached = found
    _llama_port_probed_at = now
    return found


def check_llama_health() -> bool:
    """
    Check if llama.cpp server is running and healthy.

    Returns:
        True if llama.cpp server is available and responding, False otherwise
    """
    return _find_live_llama_port() is not None


def get_llama_endpoint() -> str:
    """
    Get the base URL for the llama.cpp server.

    Returns:
        Base URL string like "http://localhost:8080"
    """
    config = _get_cached_config()
    port = config.config.get("server_port", 8080)
    return f"http://localhost:{port}"


def get_llama_info() -> dict:
    """
    Get information about the running llama.cpp server.

    Returns a status dict in EVERY case — never an empty dict.  Callers
    (admin UI + diagnostic probes) rely on the presence of a 'running'
    key; previously we returned ``{}`` when health-check failed, which
    forced every caller to probe `.get('running', False)` defensively.

    Returns:
        Dict with at minimum `running` (bool) and `port` (int), plus
        `models` / `endpoint` / `error` when the server is reachable.
    """
    config = _get_cached_config()
    port = config.config.get("server_port", 8080)

    if not check_llama_health():
        return {"running": False, "port": port, "endpoint": f"http://localhost:{port}"}

    try:
        response = requests.get(f"http://localhost:{port}/v1/models", timeout=2)
        if response.status_code == 200:
            data = response.json()
            models = data.get("models", data.get("data", []))
            return {
                "running": True,
                "port": port,
                "models": models,
                "endpoint": f"http://localhost:{port}"
            }
    except Exception as e:
        return {"running": True, "port": port,
                "endpoint": f"http://localhost:{port}",
                "error": f"{type(e).__name__}: {e}"}

    return {"running": True, "port": port, "endpoint": f"http://localhost:{port}"}


if __name__ == "__main__":
    # Test configuration and server
    logging.basicConfig(level=logging.INFO)

    def progress(msg):
        print(f"[Progress] {msg}")

    # Initialize on first run
    if initialize_llama_on_first_run(progress):
        print("Initialization successful!")

        # Try to start server
        config = LlamaConfig()
        if config.start_server():
            print("Server started successfully!")

            # Test chat completion
            response = config.chat_completion([
                {"role": "user", "content": "Hello! Say hi in one sentence."}
            ])
            print(f"AI Response: {response}")

            config.stop_server()
        else:
            print("Failed to start server")
    else:
        print("Initialization failed")
