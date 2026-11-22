"""python-embed must carry dnspython, the MX lookup HARTOS's mailbox code uses.

HARTOS d072f8ea6 declares dnspython==2.7.0 in its requirements.txt:
integrations/channels/mailing_list._mx_host does `import dns.resolver` to find
a domain's mail host, and falls back to `dig`, which Windows does not have.
HARTOS is installed into the bundle with --no-deps and cx_Freeze never traces
its modules, so a HARTOS dependency reaches the frozen app only when
scripts/deps.py names it.  Without this entry the installed app has no MX
lookup at all.

The distribution is "dnspython" and the folder it installs is "dns", so the
folder name is listed too: build.py's presence check
(deps.missing_embed_packages) would otherwise look for a "dnspython" folder,
never find it, and fail every build.
"""
import importlib.util
import os
import re
import sys

import pytest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_ROOT, 'scripts'))

import deps  # noqa: E402


def _hartos_requirements():
    """HARTOS's own requirements.txt: beside the `core` package this run
    imports HARTOS from, else the sibling checkout.  None when HARTOS is
    installed as a wheel, which ships no requirements.txt."""
    roots = []
    try:
        spec = importlib.util.find_spec('core')
    except (ImportError, ValueError):
        spec = None
    for folder in (spec.submodule_search_locations or []) if spec else []:
        roots.append(os.path.dirname(folder))
    roots.append(os.path.join(os.path.dirname(_ROOT), 'HARTOS'))
    for root in roots:
        path = os.path.join(root, 'requirements.txt')
        if os.path.isfile(path) and os.path.isdir(os.path.join(root, 'integrations')):
            return path
    return None


def _pin_in(path, name):
    with open(path, encoding='utf-8') as fh:
        found = re.findall(rf'(?im)^{re.escape(name)}==(\S+)\s*$', fh.read())
    return found[0] if len(found) == 1 else None


def test_the_frozen_dependency_set_carries_dnspython():
    pin = deps.EMBED_DEPS.get('dnspython')
    assert pin, 'EMBED_DEPS has no pinned dnspython'
    assert f'dnspython=={pin}' in deps.get_embed_install_list()
    assert deps.get_all_deps().get('dnspython') == pin


def test_the_pin_is_the_one_hartos_declares():
    """One pin, HARTOS's: read from its requirements.txt, not typed again."""
    declared = _hartos_requirements()
    if declared is None:
        pytest.skip('no HARTOS requirements.txt on this machine (HARTOS is '
                    'installed as a wheel): its dnspython pin cannot be read')
    hartos_pin = _pin_in(declared, 'dnspython')
    assert hartos_pin, f'{declared} declares no single dnspython pin'
    assert deps.EMBED_DEPS.get('dnspython') == hartos_pin


def test_requirements_txt_is_what_deps_py_generates(tmp_path):
    """requirements.txt is generated (python scripts/deps.py requirements) and
    is what macOS and Linux CI and a developer install read; e0957cfc added
    the entry and left the file as it was."""
    fresh = tmp_path / 'requirements.txt'
    deps.generate_requirements(str(fresh))
    with open(os.path.join(_ROOT, 'requirements.txt'), encoding='utf-8') as fh:
        committed = fh.read().splitlines()

    assert committed == fresh.read_text(encoding='utf-8').splitlines()
    assert f"dnspython=={deps.EMBED_DEPS.get('dnspython')}" in committed


def test_it_is_looked_for_in_the_folder_it_installs():
    assert deps.embed_package_dir_name('dnspython') == 'dns'


def test_an_embed_with_the_dns_folder_is_complete(tmp_path):
    (tmp_path / 'dns').mkdir()
    for name in deps.EMBED_DEPS:
        if name != 'dnspython':
            os.makedirs(tmp_path / deps.embed_package_dir_name(name), exist_ok=True)

    assert deps.missing_embed_packages(str(tmp_path)) == []


def test_an_embed_without_the_dns_folder_is_reported(tmp_path):
    for name in deps.EMBED_DEPS:
        if name != 'dnspython':
            os.makedirs(tmp_path / deps.embed_package_dir_name(name), exist_ok=True)
    # a folder under the distribution's name is not the package
    (tmp_path / 'dnspython').mkdir(exist_ok=True)

    assert 'dnspython' in deps.missing_embed_packages(str(tmp_path))
