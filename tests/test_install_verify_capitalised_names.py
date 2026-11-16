"""A package whose distribution name has capitals is verified by its real name.

WHAT WENT WRONG (owner's desktop, build 75, 16 Nov 2026 06:33)
  The crawl4ai setup the owner allowed ran pip with rc 0 (crawl4ai 0.9.5,
  playwright 1.65.2 into ~/.nunba/site-packages), then the post-install
  check (tts.package_installer._verify_user_site_imports) ran
  `import MarkupSafe`.  The distribution is MarkupSafe; its package is
  markupsafe.  On Windows the folder check matched markupsafe/ ignoring
  case, Python's import did not, so the check reported a broken install,
  quarantined markupsafe's dist-info, and the setup was recorded failed.

THE RULE
  The check imports a package by the name its folder has on disk.  A
  capitalised package that installed fine passes and keeps its files; one
  that is really broken is still quarantined.

    python -m pytest tests/test_install_verify_capitalised_names.py -q
"""
import sys
from unittest.mock import patch

from tts import package_installer as pi


def _pkg(root, name, body='x = 1\n'):
    d = root / name
    d.mkdir(parents=True, exist_ok=True)
    (d / '__init__.py').write_text(body, encoding='utf-8')
    return d


def _verify(success_line, args, user_sp, bundle):
    with patch.object(pi, 'get_embed_python', return_value=sys.executable), \
         patch.object(pi, 'get_embed_site_packages', return_value=str(bundle)):
        return pi._verify_user_site_imports(success_line, args, str(user_sp))


def test_a_capitalised_package_that_installed_fine_passes(tmp_path):
    user_sp, bundle = tmp_path / 'usersite', tmp_path / 'bundle'
    _pkg(user_sp, 'casedsafe')
    (user_sp / 'casedsafe-3.0.4.dist-info').mkdir()
    _pkg(bundle, 'casedsafe')            # a bundled copy: quarantine would fire
    ok, bad = _verify('Successfully installed CasedSafe-3.0.4',
                      ['install', 'crawl4ai'], user_sp, bundle)
    assert (ok, bad) == (True, []), bad
    assert (user_sp / 'casedsafe').is_dir()
    assert (user_sp / 'casedsafe-3.0.4.dist-info').is_dir(), 'its dist-info was quarantined'
    assert not [p for p in user_sp.iterdir() if p.name.startswith('_quarantine_')]


def test_a_capitalised_package_that_is_broken_is_still_quarantined(tmp_path):
    user_sp, bundle = tmp_path / 'usersite', tmp_path / 'bundle'
    _pkg(user_sp, 'casedtorn', body="raise ImportError('torn install')\n")
    (user_sp / 'casedtorn-1.0.dist-info').mkdir()
    _pkg(bundle, 'casedtorn')
    ok, bad = _verify('Successfully installed CasedTorn-1.0',
                      ['install', 'casedtorn'], user_sp, bundle)
    assert ok is False and bad == ['CasedTorn']
    assert not (user_sp / 'casedtorn').exists(), 'a broken copy kept shadowing the bundle'
    quarantined = [p for p in user_sp.iterdir() if p.name.startswith('_quarantine_')]
    assert len(quarantined) == 1 and (quarantined[0] / 'casedtorn' / '__init__.py').exists()
