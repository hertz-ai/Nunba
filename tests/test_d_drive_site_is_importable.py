"""A package installed in the private D: site can be imported.

WHAT WENT WRONG (owner's desktop, 15 Nov 2026)
  tts.package_installer installs into D:\\.nunba\\site-packages when C: has no
  room (the CUDA-torch fallback, and now the crawl4ai setup the owner allowed
  with C: at 4.8 GB free), but ensure_user_site_on_path put only the C: site
  on sys.path, so nothing installed on D: could ever be imported.

THE RULE
  The private D: site is on sys.path after the C: site: a package in both is
  still the C: copy.  A D: folder that is not private to this user is not
  added (tts._private_dir).

    python -m pytest tests/test_d_drive_site_is_importable.py -q
"""
import sys

import pytest


@pytest.fixture
def sites(monkeypatch, tmp_path):
    from tts import package_installer as pi
    c_site = tmp_path / 'c' / 'site-packages'
    d_site = tmp_path / 'd' / 'site-packages'
    c_site.mkdir(parents=True)
    d_site.mkdir(parents=True)
    monkeypatch.setattr(pi, 'get_user_site_packages', lambda: str(c_site))
    monkeypatch.setattr(sys, 'path', [p for p in sys.path if 'site-packages' not in p
                                      or 'PycharmProjects' in p])
    return pi, str(c_site), str(d_site)


def test_the_private_d_site_is_importable_after_the_c_site(sites, monkeypatch):
    pi, c_site, d_site = sites
    monkeypatch.setattr(pi, '_private_d_drive_sites', lambda: [d_site])
    pi.ensure_user_site_on_path()
    assert c_site in sys.path and d_site in sys.path, sys.path[:5]
    assert sys.path.index(c_site) < sys.path.index(d_site)


def test_a_d_folder_that_is_not_private_is_not_added(sites, monkeypatch):
    pi, c_site, d_site = sites
    monkeypatch.setattr(pi, '_private_d_drive_sites', lambda: [])
    pi.ensure_user_site_on_path()
    assert c_site in sys.path
    assert d_site not in sys.path


def test_a_second_call_adds_nothing_twice(sites, monkeypatch):
    pi, c_site, d_site = sites
    monkeypatch.setattr(pi, '_private_d_drive_sites', lambda: [d_site])
    pi.ensure_user_site_on_path()
    pi.ensure_user_site_on_path()
    assert sys.path.count(d_site) == 1 and sys.path.count(c_site) == 1
