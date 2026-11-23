"""Run the cross-repo ctx-size guard from Nunba's suite too.

The guard itself lives ONCE, in HARTOS at
``tests/unit/test_source_guard_one_ctx_size_authority.py``, because that is
where the vocabulary it protects lives (``core/constants.py``,
``core/llama_geometry.py``) and because HARTOS is the shared dependency — Nunba
imports HARTOS, never the reverse.

But the invariant is CROSS-repo: the spawner it is really guarding is Nunba's
``llama/llama_config.py``, and Nunba's CI (``.github/workflows/quality.yml``)
runs Nunba's pytest, not HARTOS's.  A guard only one of the two CIs executes
would let a Nunba-side regression land green.

So this file is a DELEGATE, not a copy: it locates the HARTOS checkout, imports
that one module, and re-exports its TestCase classes for collection.  No policy
— no env name, no allowlist, no tier — is restated here.  A second copy of the
rules is the exact failure the rules are about.
"""
import os
import sys

import pytest

# The one rule for where HARTOS is (tests/hartos_root.py).
from tests.hartos_root import hartos_root as _hartos_root  # noqa: E402

_ROOT = _hartos_root()
if _ROOT is None:
    pytest.skip(
        'HARTOS checkout not found (set HARTOS_REPO, or check out HARTOS '
        'beside Nunba-HART-Companion) — the one-ctx-size-authority guard did '
        'NOT run from Nunba',
        allow_module_level=True)

_GUARD = os.path.join(_ROOT, 'tests', 'unit',
                      'test_source_guard_one_ctx_size_authority.py')
if not os.path.isfile(_GUARD):
    pytest.skip(
        f'HARTOS is at {_ROOT} but does not carry '
        f'tests/unit/test_source_guard_one_ctx_size_authority.py — the guard '
        f'was deleted or moved, which is itself worth noticing',
        allow_module_level=True)

if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
# The guard resolves the Nunba tree itself, but say so explicitly: when Nunba
# is the thing under test it must never be the half that silently skips.
os.environ.setdefault(
    'NUNBA_REPO', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_spec = __import__('importlib.util', fromlist=['util']).spec_from_file_location(
    'hartos_guard_one_ctx_size_authority', _GUARD)
_mod = __import__('importlib.util', fromlist=['util']).module_from_spec(_spec)
_spec.loader.exec_module(_mod)

# Re-export for collection.  Named imports rather than `import *` so a renamed
# class here is a loud ImportError instead of a silently-empty test file.
OneEnvVarNameForNCtx = _mod.OneEnvVarNameForNCtx
OneDerivationForNCtx = _mod.OneDerivationForNCtx
VendoredInjectorIsInert = _mod.VendoredInjectorIsInert
