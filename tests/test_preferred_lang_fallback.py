"""Regression guard: preferred_lang must fall back to the canonical
core.user_lang reader, never to a bare 'en' default.

The bug class: frontend POSTs /chat without preferred_lang; backend
defaulted to 'en'; Tamil user never got Indic Parler synthesis and
the draft-skip gate never fired.  The canonical reader is
core.user_lang.get_preferred_lang, populated from hart_language.json.

FT: Both entry points resolve preferred_lang from the canonical
    reader when the body lacks the key.
NFT: AST-level scan forbids re-introducing `data.get('preferred_lang',
    'en')` or `payload.get('preferred_lang', 'en')` anywhere in the
    chat entry paths.

WRITE SIDE (added 2026-08-13): the same signal has exactly ONE writer,
`core.user_lang.set_preferred_lang`.  `hart_seal` used to `open(...,
'w')` the file directly (chatbot_routes.py:4349), which skipped all
three guarantees the canonical writer provides — SUPPORTED_LANG_DICT
validation, atomic tmp+fsync+os.replace, and the `on_lang_change`
subscriber bus.  The last one mattered most: HART onboarding is the
moment the language is chosen for the very first time, and it was the
one language transition that notified nobody, so
`model_lifecycle._evict_draft_on_non_latin_switch` never fired for it.
`TestLanguageWriterIsCanonical` fails if any first-party module opens
that file for writing again.
"""
import ast
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

HARTOS_ROOT = PROJECT_ROOT.parent / "HARTOS"

CHAT_ENTRY_FILES = [
    PROJECT_ROOT / "routes" / "chatbot_routes.py",
    HARTOS_ROOT / "hart_intelligence_entry.py",
]


class _BadDefaultFinder(ast.NodeVisitor):
    """Flags `X.get('preferred_lang', 'en')` — the exact regression."""

    def __init__(self) -> None:
        self.violations: list[tuple[int, str]] = []

    def visit_Call(self, node: ast.Call) -> None:
        # Match `<any>.get('preferred_lang', 'en')` with literal defaults.
        if (
            isinstance(node.func, ast.Attribute)
            and node.func.attr == "get"
            and len(node.args) == 2
            and isinstance(node.args[0], ast.Constant)
            and node.args[0].value == "preferred_lang"
            and isinstance(node.args[1], ast.Constant)
            and isinstance(node.args[1].value, str)
            and node.args[1].value.lower().startswith("en")
        ):
            src = ast.unparse(node) if hasattr(ast, "unparse") else "<get>"
            self.violations.append((node.lineno, src))
        self.generic_visit(node)


class TestPreferredLangFallback:
    """Static + canonical-reader regression guard."""

    def test_no_bare_en_default_in_chat_entries(self):
        """Every chat entry path resolves via the canonical reader,
        never falls back to a hardcoded 'en'."""
        offenders: list[str] = []
        for path in CHAT_ENTRY_FILES:
            if not path.exists():
                continue
            tree = ast.parse(path.read_text(encoding="utf-8"))
            finder = _BadDefaultFinder()
            finder.visit(tree)
            for lineno, src in finder.violations:
                offenders.append(f"{path}:{lineno} :: {src}")
        assert not offenders, (
            "preferred_lang bare 'en' default re-introduced — must use "
            "core.user_lang.get_preferred_lang() fallback.  Violations:\n  "
            + "\n  ".join(offenders)
        )

    def test_canonical_reader_is_imported_in_chat_entries(self):
        """Every chat entry that reads preferred_lang from body
        also references core.user_lang.get_preferred_lang."""
        missing: list[str] = []
        for path in CHAT_ENTRY_FILES:
            if not path.exists():
                continue
            src = path.read_text(encoding="utf-8")
            if "preferred_lang" not in src:
                continue
            if "get_preferred_lang" not in src:
                missing.append(str(path))
        assert not missing, (
            "chat entry touches preferred_lang but never references "
            "core.user_lang.get_preferred_lang — fallback is missing "
            "in:\n  " + "\n  ".join(missing)
        )

    def test_canonical_reader_returns_persisted_value(self, tmp_path, monkeypatch):
        """When hart_language.json has 'ta', the canonical reader
        returns 'ta' — not 'en'.  Drives the real file; the only
        patch point is the module-level path constant."""
        try:
            import core.user_lang as user_lang_mod
        except Exception:
            import pytest
            pytest.skip("core.user_lang not importable in this env")

        # Write a valid hart_language.json with 'ta' selected.
        lang_file = tmp_path / "hart_language.json"
        lang_file.write_text(
            '{"language": "ta", "source": "test"}', encoding="utf-8"
        )
        # Patch the module-level path + clear the mtime cache so the
        # reader hits the tmp file on next call.
        monkeypatch.setattr(user_lang_mod, "_HART_LANG_PATH", str(lang_file))
        monkeypatch.setitem(user_lang_mod._cache, "value", None)
        monkeypatch.setitem(user_lang_mod._cache, "mtime", 0)

        val = user_lang_mod.get_preferred_lang()
        assert val == "ta", (
            f"Canonical reader must return the persisted language "
            f"('ta' from hart_language.json); got {val!r}"
        )


# ── Write side: one writer for hart_language.json ────────────────────

_LANG_FILE = "hart_language.json"

# The ONE module allowed to open hart_language.json for writing.
# Everyone else must call core.user_lang.set_preferred_lang.
_SOLE_WRITER = (HARTOS_ROOT / "core" / "user_lang.py").resolve()

# First-party trees that could plausibly persist the language.  Readers
# (models/language_bootstrap.py, tts/tts_engine.py) legitimately open the
# file in READ mode, so the finder below gates on write mode only and
# leaves them alone.
_WRITE_SCAN_ROOTS = [
    PROJECT_ROOT / "routes",
    PROJECT_ROOT / "models",
    PROJECT_ROOT / "tts",
    PROJECT_ROOT / "llama",
    PROJECT_ROOT / "desktop",
    PROJECT_ROOT / "main.py",
    PROJECT_ROOT / "app.py",
    HARTOS_ROOT / "hart_intelligence_entry.py",
    HARTOS_ROOT / "hart_onboarding.py",
]

_WRITE_MODES = ("w", "a", "w+", "a+", "wb", "ab", "r+", "x")


class _LangFileWriteFinder(ast.NodeVisitor):
    """Flags `open(<...hart_language.json...>, '<write mode>')`.

    Mode is taken from the 2nd positional arg or the `mode=` keyword;
    a bare `open(p)` defaults to 'r' and is therefore ignored, which is
    what keeps the two legitimate readers out of the violation list.
    """

    def __init__(self) -> None:
        self.violations: list[tuple[int, str]] = []

    def visit_Call(self, node: ast.Call) -> None:
        if isinstance(node.func, ast.Name) and node.func.id == "open":
            try:
                rendered = ast.unparse(node)
            except Exception:  # pragma: no cover - py<3.9 safety
                rendered = ""
            if _LANG_FILE in rendered:
                mode = None
                if len(node.args) >= 2 and isinstance(node.args[1], ast.Constant):
                    mode = node.args[1].value
                for kw in node.keywords:
                    if kw.arg == "mode" and isinstance(kw.value, ast.Constant):
                        mode = kw.value.value
                if isinstance(mode, str) and mode in _WRITE_MODES:
                    self.violations.append((node.lineno, rendered))
        self.generic_visit(node)


def _iter_py_files():
    for root in _WRITE_SCAN_ROOTS:
        if root.is_file() and root.suffix == ".py":
            yield root
        elif root.is_dir():
            for p in root.rglob("*.py"):
                if "__pycache__" in p.parts:
                    continue
                yield p


class TestLanguageWriterIsCanonical:
    """`hart_language.json` has exactly one writer (CLAUDE.md Gate 4)."""

    def test_no_direct_write_to_hart_language_json(self):
        """Only core.user_lang.set_preferred_lang may write the file.

        Proven red before the fix: chatbot_routes.py's hart_seal opened
        the file with `'w'` directly, so the seal wrote the language
        without validating it, without atomicity, and without firing
        on_lang_change.
        """
        offenders: list[str] = []
        for path in _iter_py_files():
            if path.resolve() == _SOLE_WRITER:
                continue
            try:
                tree = ast.parse(path.read_text(encoding="utf-8"))
            except (OSError, SyntaxError):
                continue
            finder = _LangFileWriteFinder()
            finder.visit(tree)
            for lineno, src in finder.violations:
                offenders.append(f"{path}:{lineno} :: {src}")
        assert not offenders, (
            f"{_LANG_FILE} must have exactly ONE writer "
            "(core.user_lang.set_preferred_lang) — it validates against "
            "SUPPORTED_LANG_DICT, writes atomically, and fires "
            "on_lang_change subscribers.  Direct writes found:\n  "
            + "\n  ".join(offenders)
        )

    def test_hart_seal_uses_the_canonical_writer(self):
        """hart_seal persists the ceremony language via the canonical
        writer.  Guards the inverse of the test above: deleting the
        direct write without replacing it would lose the language
        entirely, and that must not read as 'fixed'."""
        src = (PROJECT_ROOT / "routes" / "chatbot_routes.py").read_text(
            encoding="utf-8"
        )
        assert "set_preferred_lang" in src, (
            "routes/chatbot_routes.py no longer references "
            "set_preferred_lang — the HART ceremony language would stop "
            "persisting for the next boot (TTS warmup + draft gate read "
            "it via core.user_lang)."
        )


# ── Read side: one reader for hart_language.json ─────────────────────
#
# 8bbe771c4 moved hart_language.json to the data root (it had been the one
# file left in ~/Documents/Nunba on macOS / Linux) and taught
# core.user_lang to carry an old file over, once.  tts_engine.TTSEngine
# still read the OLD path itself, so after the person switched language
# (the new file says 'hi'; the old one still says 'ta') TTS warm-up picked
# 'ta' -- measured by scratchpad/e1a_tts_probe.py.  A reader that builds the
# path itself also skips the carry-over and the pytest guard.

# Every first-party tree, not only the ones that used to write it.
_READ_SCAN_ROOTS = _WRITE_SCAN_ROOTS + [
    PROJECT_ROOT / "integrations",
    PROJECT_ROOT / "core",
    PROJECT_ROOT / "scripts",
    HARTOS_ROOT / "core",
    HARTOS_ROOT / "hartos",
    HARTOS_ROOT / "integrations",
    HARTOS_ROOT / "security",
]


def _docstring_ids(tree):
    ids = set()
    for n in ast.walk(tree):
        if isinstance(n, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef,
                          ast.ClassDef)) and n.body \
                and isinstance(n.body[0], ast.Expr) \
                and isinstance(n.body[0].value, ast.Constant):
            ids.add(id(n.body[0].value))
    return ids


def _names_the_lang_file(tree):
    """Line numbers of a path-like constant naming hart_language.json: a
    string holding it with no whitespace (prose and docstrings are not a
    path in use), in any call or path expression."""
    docs = _docstring_ids(tree)
    return [n.lineno for n in ast.walk(tree)
            if isinstance(n, ast.Constant) and isinstance(n.value, str)
            and id(n) not in docs and _LANG_FILE in n.value
            and not any(c.isspace() for c in n.value)]


def _iter_read_scan_files():
    # os.walk + string keys: Path.resolve() per file took the scan past the
    # 60 s test timeout on a loaded box.
    seen = set()
    for root in _READ_SCAN_ROOTS:
        if root.is_file():
            candidates = [str(root)]
        elif root.is_dir():
            candidates = []
            for dirpath, dirnames, filenames in os.walk(root):
                dirnames[:] = [d for d in dirnames if d not in (
                    "__pycache__", "tests", "node_modules", ".venv", "venv")]
                candidates += [os.path.join(dirpath, n) for n in filenames]
        else:
            candidates = []
        for c in candidates:
            key = os.path.normcase(os.path.abspath(c))
            if not c.endswith(".py") or key in seen:
                continue
            seen.add(key)
            yield Path(c)


class TestLanguageReaderIsCanonical:
    """hart_language.json has exactly one reader too: core.user_lang."""

    def test_no_module_but_user_lang_names_the_file(self):
        scanned, offenders = 0, []
        sole = os.path.normcase(str(_SOLE_WRITER))
        for path in _iter_read_scan_files():
            if os.path.normcase(os.path.abspath(path)) == sole:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            scanned += 1
            if _LANG_FILE not in text:   # no constant can name it: skip the parse
                continue
            try:
                tree = ast.parse(text)
            except SyntaxError:
                continue
            offenders += [f"{path}:{ln}" for ln in _names_the_lang_file(tree)]
        assert scanned > 300, scanned   # the scan saw both trees
        assert not offenders, (
            f"{_LANG_FILE} must be read through core.user_lang."
            "get_preferred_lang (it carries a pre-move file over and "
            "follows the data root).  Direct paths found:\n  "
            + "\n  ".join(offenders))

    def test_the_reader_guard_can_fail(self):
        planted = ast.parse(
            "import os\n"
            "p = os.path.join(os.path.expanduser('~'), 'Documents', 'Nunba',"
            " 'data', 'hart_language.json')\n"
            "q = open('C:/x/hart_language.json')\n"
            "def f():\n    '''Reads hart_language.json (a docstring is fine).'''\n"
            "m = 'core.user_lang owns hart_language.json'\n")
        assert _names_the_lang_file(planted) == [2, 3]

    def test_tts_warmup_takes_the_canonical_language(self, tmp_path, monkeypatch):
        """TTSEngine's warm-up language is core.user_lang's answer, even
        when a stale file at the old ~/Documents path says otherwise."""
        import json

        import core.user_lang as user_lang_mod
        for var in ("HOME", "USERPROFILE"):
            monkeypatch.setenv(var, str(tmp_path))
        stale = tmp_path / "Documents" / "Nunba" / "data" / _LANG_FILE
        stale.parent.mkdir(parents=True)
        stale.write_text(json.dumps({"language": "ta"}), encoding="utf-8")
        monkeypatch.setattr(user_lang_mod, "get_preferred_lang", lambda *a, **k: "hi")

        from tts.tts_engine import TTSEngine
        engine = TTSEngine()

        assert engine._language == "hi"
