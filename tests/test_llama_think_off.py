"""Task #652 — thinking MUST stay off for every spawned llama-server.

Background (measured live 2026-08-12): on llama.cpp build 10330 the
``--reasoning-budget 0`` flag stopped suppressing thinking, while
``--reasoning-format deepseek`` kept routing thoughts into
``message.reasoning_content``.  Net effect: ``message.content`` came back
EMPTY on 8/8 replayed draft bodies and the live app logged reply_len=0 /
confidence=0.0 / every classifier flag null on 45/45 turns.  The draft-first
classifier was completely dead and failed SILENTLY.

The fix passes ``LLAMA_ARG_CHAT_TEMPLATE_KWARGS={"enable_thinking":false}``
in the spawned process environment — deliberately the ENV form, because an
unknown llama-server CLI FLAG makes the process EXIT (turning a thinking bug
into a total LLM outage on a box with a different llama.cpp build) whereas an
unknown env var is simply ignored.

The AST test below is the one that actually prevents regression: it fails if
ANY llama-server spawn in llama_config.py forgets the env, which is exactly
how the caption/draft server came to miss it (it passed no ``env=`` at all
and silently inherited the parent's).
"""
import ast
import os
from pathlib import Path

import pytest

from llama.llama_config import (
    _LLAMA_THINK_OFF_ENV,
    _LLAMA_THINK_OFF_VALUE,
    llama_child_env,
)

_CONFIG_PATH = Path(__file__).resolve().parents[1] / 'llama' / 'llama_config.py'


def test_env_sets_thinking_off():
    env = llama_child_env()
    assert env[_LLAMA_THINK_OFF_ENV] == _LLAMA_THINK_OFF_VALUE


def test_value_is_valid_json_llama_can_parse():
    """llama.cpp requires a valid JSON object string, else it rejects the arg."""
    import json
    parsed = json.loads(_LLAMA_THINK_OFF_VALUE)
    assert parsed == {'enable_thinking': False}


def test_inherits_parent_environment():
    """Must be a SUPERSET of os.environ — the spawn relied on inheritance
    (PATH for ggml-cuda.dll, CUDA vars, HF cache locations)."""
    env = llama_child_env()
    for key, value in os.environ.items():
        assert env.get(key) == value, f'lost inherited env var {key}'


def test_explicit_operator_choice_wins():
    """An operator who deliberately enables thinking must not be overridden."""
    base = dict(os.environ)
    base[_LLAMA_THINK_OFF_ENV] = '{"enable_thinking":true}'
    env = llama_child_env(base)
    assert env[_LLAMA_THINK_OFF_ENV] == '{"enable_thinking":true}'


def test_does_not_mutate_process_environment():
    """Setting os.environ would leak the flag to every unrelated child."""
    had = _LLAMA_THINK_OFF_ENV in os.environ
    llama_child_env()
    assert (_LLAMA_THINK_OFF_ENV in os.environ) == had


def _popen_calls(tree):
    """Every subprocess.Popen(...) call node in the module."""
    out = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        f = node.func
        if isinstance(f, ast.Attribute) and f.attr == 'Popen':
            out.append(node)
    return out


def test_every_llama_spawn_passes_thinking_off_env():
    """DRIFT GUARD — the check that would have caught the caption-server gap.

    Any new llama-server spawn that forgets ``env=llama_child_env()`` would
    silently reintroduce #652 for that server only, which is the hardest
    version of this bug to spot (one leg thinks, the other does not).
    """
    tree = ast.parse(_CONFIG_PATH.read_text(encoding='utf-8'))
    calls = _popen_calls(tree)
    assert calls, 'expected at least one subprocess.Popen in llama_config.py'

    offenders = []
    for call in calls:
        env_kw = next((k for k in call.keywords if k.arg == 'env'), None)
        if env_kw is None:
            offenders.append((call.lineno, 'no env= kwarg'))
            continue
        val = env_kw.value
        ok = (isinstance(val, ast.Call)
              and isinstance(val.func, ast.Name)
              and val.func.id == 'llama_child_env')
        # The main-server spawn assigns to a local `env` first (it also has to
        # prepend PATH), so a bare Name is acceptable ONLY if that local was
        # built from llama_child_env — asserted separately below.
        if not ok and not (isinstance(val, ast.Name) and val.id == 'env'):
            offenders.append((call.lineno, ast.dump(val)[:60]))
    assert not offenders, (
        'llama-server spawn(s) missing thinking-off env (task #652): '
        f'{offenders}'
    )


def test_local_env_var_is_built_from_helper():
    """The main-server spawn passes `env=env`; prove that local came from the
    helper and not from a bare os.environ.copy() (which is what it used to be
    and is exactly the regression this guards)."""
    src = _CONFIG_PATH.read_text(encoding='utf-8')
    assert 'env = llama_child_env()' in src, (
        'main llama-server spawn no longer builds its env from '
        'llama_child_env() — task #652 regression'
    )


def test_both_thinking_off_layers_are_present():
    """TWO-WAY drift guard over the two DELIBERATE layers.

    This is NOT one concern implemented twice.  There are two independent
    reasons a request can end up thinking, and each layer covers a hole the
    other cannot:

      1. SERVER layer (llama_config, task #652) — set once at spawn, so it
         covers EVERY path including ones nobody has written yet.  Cannot
         help when the endpoint is a llama-server this process did not spawn
         (externally started, remote, or cloud).
      2. REQUEST layer (routes/upload_routes.py, 2026-08-04) — travels with
         the payload, so it survives ANY endpoint.  Cannot help a call site
         that forgets it.

    The vision route found this bug FIRST (empty description, HTTP 200, no
    log) and its per-request kwarg is defence-in-depth, not drift — see
    memory/feedback_dry_overengineering.md.  Deleting either layer because
    "the other one covers it" is the regression this test exists to stop.
    """
    root = _CONFIG_PATH.parents[1]

    server_layer = _CONFIG_PATH.read_text(encoding='utf-8')
    assert 'enable_thinking' in server_layer, 'server layer lost (task #652)'

    vision = root / 'routes' / 'upload_routes.py'
    assert vision.exists(), 'routes/upload_routes.py moved — re-point this test'
    vision_src = vision.read_text(encoding='utf-8')
    assert 'enable_thinking' in vision_src, (
        'routes/upload_routes.py no longer disables thinking on the vision '
        'request — that is the 2026-08-04 empty-description bug, and the '
        'server-level env var does NOT cover a llama-server we did not spawn'
    )
    # The value must AGREE across layers: one says false, the other must not
    # say true.  A future edit flipping one is a silent split-brain.
    assert '"enable_thinking": True' not in vision_src
    assert '"enable_thinking":true' not in server_layer.replace(' ', '')


def test_no_third_unaudited_copy():
    """Any NEW site disabling thinking must be a deliberate, reviewed layer.

    Allowlist is explicit so a third copy trips this and gets a decision
    (extend a layer vs add one) instead of silently becoming drift.
    """
    root = _CONFIG_PATH.parents[1]
    allowed = {
        Path('llama') / 'llama_config.py',                 # server layer
        Path('routes') / 'upload_routes.py',               # request layer
        Path('tests') / 'test_vision_reasoning_budget.py',  # pins layer 2
        Path('tests') / Path(__file__).name,               # pins layer 1
    }
    skip_dirs = {'python-embed', 'node_modules', '.venv', '__pycache__',
                 'build', '.git', 'dist', 'pip', 'landing-page'}
    hits = []
    for path in root.rglob('*.py'):
        if any(part in skip_dirs for part in path.parts):
            continue
        rel = path.relative_to(root)
        if rel in allowed:
            continue
        try:
            text = path.read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        if 'enable_thinking' in text:
            hits.append(str(rel))
    assert not hits, (
        f'new enable_thinking site(s): {hits}. Decide deliberately: reuse '
        'llama_child_env() (server layer) or the vision route pattern '
        '(request layer), then add the file here with the reason.'
    )


if __name__ == '__main__':
    raise SystemExit(pytest.main([__file__, '-v']))
