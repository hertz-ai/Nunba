"""python-embed must carry botbuilder, the library HARTOS's Teams adapter imports.

HARTOS integrations/channels/extensions/teams_adapter.py imports
botbuilder.core, botbuilder.schema and botbuilder.core.teams (Microsoft's Bot
Framework SDK).  Without them TeamsAdapter raises "botbuilder not installed"
and the owner's answer to the Teams card ends 409 "register_channel returned
False" (HARTOS review of 0d51bd263, rv_chan 2026-11-23: the installed Nunba
had no botbuilder).  HARTOS is installed into the bundle with --no-deps and
cx_Freeze never traces its modules, so a HARTOS dependency reaches the
frozen app only when scripts/deps.py names it, as dnspython does.

The embed installs are --no-deps too (build.py's Gate B top-up), so
botbuilder-core's closure is named with it, each pin HARTOS's own.  Four of
them install into namespace folders (botbuilder/core, botframework/connector,
azure/core ...), which the presence check must look in.
"""
import os
import re
import sys

import pytest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_ROOT, 'scripts'))

import deps  # noqa: E402

from tests.hartos_root import hartos_root as _hartos_root  # noqa: E402
from tests.hartos_root import searched as _searched  # noqa: E402

#: botbuilder-core and the part of its closure this bundle had nowhere.
_CLOSURE = ('botbuilder-core', 'botbuilder-schema', 'botframework-connector',
            'botframework-streaming', 'msrest', 'msal', 'azure-core',
            'isodate', 'jsonpickle', 'requests-oauthlib', 'oauthlib')
#: Where each installs when that is not its name with '-' as '_'.
_FOLDERS = {'botbuilder-core': 'botbuilder/core',
            'botbuilder-schema': 'botbuilder/schema',
            'botframework-connector': 'botframework/connector',
            'botframework-streaming': 'botframework/streaming',
            'azure-core': 'azure/core'}


def _hartos_requirements():
    root = _hartos_root()
    if root is None:
        return None, f'HARTOS was not found (looked at {_searched()})'
    path = os.path.join(root, 'requirements.txt')
    if not os.path.isfile(path):
        return None, f'HARTOS is at {root} but has no requirements.txt there'
    return path, ''


def _pin_in(path, name):
    with open(path, encoding='utf-8') as fh:
        found = re.findall(rf'(?im)^{re.escape(name)}==(\S+)\s*$', fh.read())
    return found[0] if len(found) == 1 else None


@pytest.mark.parametrize('name', _CLOSURE)
def test_the_frozen_dependency_set_carries_it(name):
    pin = deps.EMBED_DEPS.get(name)
    assert pin, f'EMBED_DEPS has no pinned {name}'
    assert f'{name}=={pin}' in deps.get_embed_install_list()


@pytest.mark.parametrize('name', _CLOSURE)
def test_each_pin_is_the_one_hartos_declares(name):
    declared, why_not = _hartos_requirements()
    if declared is None:
        pytest.skip(f'{why_not}: its {name} pin cannot be read')
    hartos_pin = _pin_in(declared, name)
    assert hartos_pin, f'{declared} declares no single {name} pin'
    assert deps.EMBED_DEPS.get(name) == hartos_pin


def test_requirements_txt_carries_it_as_deps_py_generates(tmp_path):
    fresh = tmp_path / 'requirements.txt'
    deps.generate_requirements(str(fresh))
    with open(os.path.join(_ROOT, 'requirements.txt'), encoding='utf-8') as fh:
        committed = fh.read().splitlines()
    assert committed == fresh.read_text(encoding='utf-8').splitlines()
    assert f"botbuilder-core=={deps.EMBED_DEPS.get('botbuilder-core')}" in committed


@pytest.mark.parametrize('name,folder', sorted(_FOLDERS.items()))
def test_it_is_looked_for_in_the_folder_it_installs(name, folder):
    assert deps.embed_package_dir_name(name) == folder


def test_an_embed_with_its_folders_is_complete(tmp_path):
    for name in deps.EMBED_DEPS:
        os.makedirs(tmp_path / deps.embed_package_dir_name(name), exist_ok=True)
    assert deps.missing_embed_packages(str(tmp_path)) == []


def test_an_embed_without_the_teams_library_is_reported(tmp_path):
    for name in deps.EMBED_DEPS:
        if name != 'botbuilder-core':
            os.makedirs(tmp_path / deps.embed_package_dir_name(name), exist_ok=True)
    # The schema half of the namespace alone is not the core package.
    assert deps.missing_embed_packages(str(tmp_path)) == ['botbuilder-core']
