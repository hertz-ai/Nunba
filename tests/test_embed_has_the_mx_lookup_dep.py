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
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), 'scripts'))

import deps  # noqa: E402

# HARTOS requirements.txt, d072f8ea6
_HARTOS_PIN = '2.7.0'


def test_the_frozen_dependency_set_carries_dnspython_at_hartos_pin():
    assert deps.EMBED_DEPS.get('dnspython') == _HARTOS_PIN
    assert 'dnspython==' + _HARTOS_PIN in deps.get_embed_install_list()
    assert deps.get_all_deps().get('dnspython') == _HARTOS_PIN


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
