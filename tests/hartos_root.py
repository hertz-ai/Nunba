"""Where HARTOS lives, for the tests that read its files.  ONE rule.

    from tests.hartos_root import hartos_root

Order: HARTOS_REPO when it names a HARTOS tree, then the checkout beside
Nunba-HART-Companion, then whatever provides `core` to this interpreter (the
bundled or installed case).  None when there is none.

It lived as a private function inside test_source_guard_one_ctx_size_authority.py
and was copied, or re-derived differently, by the tests beside it; one of
them ran it out of that file's source because importing the file runs its
guard.  Not for scripts/build.py, which finds the HARTOS it BUILDS by its own
rule (sibling HARTOS or hart-backend with a pyproject.toml) and does not read
HARTOS_REPO.
"""
import os

_HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def searched() -> str:
    """The places the rule looks, for a skip text that says where it looked."""
    return (f"HARTOS_REPO={os.environ.get('HARTOS_REPO') or '(unset)'}, "
            f"{os.path.join(os.path.dirname(_HERE), 'HARTOS')}, "
            f"and the `core` package on this interpreter's path")


def hartos_root():
    """The HARTOS tree's folder, or None."""
    env = os.environ.get('HARTOS_REPO')
    if env and os.path.isfile(os.path.join(env, 'core', 'constants.py')):
        return env
    sibling = os.path.join(os.path.dirname(_HERE), 'HARTOS')
    if os.path.isfile(os.path.join(sibling, 'core', 'constants.py')):
        return sibling
    try:
        import core.constants as _cc
    except ImportError:
        return None
    # <root>/core/constants.py -> <root>
    return os.path.dirname(os.path.dirname(os.path.abspath(_cc.__file__)))
