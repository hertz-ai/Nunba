"""tts._private_dir: is a directory writable only by this user?

Review of efab9501 (SECURITY, MEDIUM): python-embed's hook put
D:\\.nunba\\site-packages at sys.path[0] and its nvidia\\*\\bin on PATH for every
worker.  A drive root's default ACL lets every authenticated user create a
folder there and Modify what is inside (measured on this box: D:\\.nunba owned
by BUILTIN\\Administrators, Authenticated Users: Modify, inherited).  The D:
site is now used only when this check calls it private.

Real ACLs, set with icacls on temp folders (Windows); no mock of the check.
"""
import os
import subprocess
import sys

import pytest

from tts import _private_dir as pd

windows = pytest.mark.skipif(sys.platform != 'win32', reason='Windows ACLs')


def _grant(path, spec):
    r = subprocess.run(['icacls', str(path), '/grant', spec],
                       capture_output=True, text=True, timeout=30)
    assert r.returncode == 0, r.stdout + r.stderr


@windows
def test_a_folder_made_private_is_private(tmp_path):
    d = tmp_path / 'root'
    assert pd.make_private_dir(str(d)) is True
    assert pd.is_private_dir(str(d)) is True
    sub = d / 'site-packages'
    sub.mkdir()
    assert pd.is_private_dir(str(sub)) is True        # inherits the ACL


@windows
def test_a_folder_everyone_logged_on_may_write_is_not_private(tmp_path):
    d = tmp_path / 'root'
    assert pd.make_private_dir(str(d)) is True
    _grant(d, '*S-1-5-11:(OI)(CI)M')                  # Authenticated Users
    assert pd.is_private_dir(str(d)) is False


@windows
def test_a_write_right_only_children_inherit_is_not_private(tmp_path):
    """An inherit-only grant does not touch the folder itself, but every
    torch/lib or nvidia/*/bin created inside gets it."""
    d = tmp_path / 'root'
    assert pd.make_private_dir(str(d)) is True
    _grant(d, '*S-1-5-11:(OI)(CI)(IO)M')
    assert pd.is_private_dir(str(d)) is False


@windows
def test_a_read_only_grant_to_others_is_still_private(tmp_path):
    d = tmp_path / 'root'
    assert pd.make_private_dir(str(d)) is True
    _grant(d, '*S-1-5-32-545:(OI)(CI)RX')             # Users: read & execute
    assert pd.is_private_dir(str(d)) is True


@windows
def test_the_drive_root_default_acl_is_not_private():
    """The measured case: whatever D:\\.nunba is on this box, a folder that
    inherits a drive root's default ACL is not private."""
    root = os.path.join('D:\\', '.nunba')
    if not os.path.isdir(root):
        pytest.skip('no D:\\.nunba on this box')
    r = subprocess.run(['icacls', root], capture_output=True, text=True, timeout=30)
    if 'S-1-5-11' not in r.stdout and 'Authenticated Users' not in r.stdout:
        pytest.skip('this D:\\.nunba does not grant Authenticated Users')
    assert pd.is_private_dir(root) is False


def test_a_missing_path_or_a_file_is_not_private(tmp_path):
    assert pd.is_private_dir(str(tmp_path / 'nope')) is False
    f = tmp_path / 'f.txt'
    f.write_text('x')
    assert pd.is_private_dir(str(f)) is False


def test_it_never_raises(monkeypatch, tmp_path):
    def boom(path):
        raise OSError('no security info')
    monkeypatch.setattr(pd, '_windows_is_private', boom)
    monkeypatch.setattr(pd.os, 'stat', boom)
    assert pd.is_private_dir(str(tmp_path)) is False


@windows
def test_the_trusted_set_is_the_machines_own_accounts_and_this_user():
    me = pd._current_user_sid()
    assert me and me.startswith('S-1-5-21-')
    assert 'S-1-5-11' not in pd._TRUSTED_SIDS          # Authenticated Users
    assert 'S-1-5-32-545' not in pd._TRUSTED_SIDS      # Users
    assert 'S-1-1-0' not in pd._TRUSTED_SIDS           # Everyone
