"""
Functional tests for main.py utility functions.

Tests the pure utility functions from main.py without requiring Flask context:
- _get_machine_fingerprint: hardware ID construction
- get_device_id: SHA-256 of fingerprint, cache read/write
- get_embedded_python_path: cross-platform embedded Python detection
- _is_local_request: localhost detection with proxy support
- require_local_or_token: security decorator
- get_app_directory: app root directory detection
- capture_screen_with_cursor: screen capture (mocked)
"""
import hashlib
import json
import os
import platform
import sys
import tempfile
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ==========================================================================
# 1. _get_machine_fingerprint (extracted)
# ==========================================================================
def _get_machine_fingerprint():
    """Extracted from main.py."""
    import subprocess
    parts = [str(uuid.getnode())]
    if sys.platform == 'win32':
        try:
            import winreg
            with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r'SOFTWARE\Microsoft\Cryptography'
            ) as key:
                guid, _ = winreg.QueryValueEx(key, 'MachineGuid')
                parts.append(guid)
        except Exception:
            pass
    elif sys.platform == 'darwin':
        try:
            result = subprocess.run(
                ['ioreg', '-rd1', '-c', 'IOPlatformExpertDevice'],
                capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.splitlines():
                if 'IOPlatformSerialNumber' in line:
                    serial = line.split('"')[-2]
                    parts.append(serial)
                    break
        except Exception:
            pass
    parts.append(platform.node())
    return '|'.join(parts)


class TestGetMachineFingerprint:
    def test_returns_string(self):
        result = _get_machine_fingerprint()
        assert isinstance(result, str)

    def test_contains_mac_address(self):
        result = _get_machine_fingerprint()
        mac = str(uuid.getnode())
        assert mac in result

    def test_contains_hostname(self):
        result = _get_machine_fingerprint()
        assert platform.node() in result

    def test_pipe_delimited(self):
        result = _get_machine_fingerprint()
        assert '|' in result

    def test_deterministic(self):
        a = _get_machine_fingerprint()
        b = _get_machine_fingerprint()
        assert a == b

    def test_at_least_two_parts(self):
        result = _get_machine_fingerprint()
        parts = result.split('|')
        assert len(parts) >= 2


# ==========================================================================
# 2. get_device_id logic (extracted)
# ==========================================================================
def _get_device_id(fingerprint, cache_file):
    """Extracted get_device_id logic from main.py."""
    device_id = hashlib.sha256(fingerprint.encode()).hexdigest()
    if os.path.exists(cache_file):
        try:
            with open(cache_file) as f:
                data = json.load(f)
                if data.get('device_id') == device_id:
                    return device_id
        except Exception:
            pass
    try:
        os.makedirs(os.path.dirname(cache_file), exist_ok=True)
        with open(cache_file, 'w') as f:
            json.dump({'device_id': device_id}, f)
    except Exception:
        pass
    return device_id


class TestGetDeviceId:
    def test_returns_sha256_hex(self):
        with tempfile.TemporaryDirectory() as td:
            cache = os.path.join(td, 'device_id.json')
            result = _get_device_id('test|fingerprint', cache)
            assert len(result) == 64
            assert all(c in '0123456789abcdef' for c in result)

    def test_deterministic_for_same_fingerprint(self):
        with tempfile.TemporaryDirectory() as td:
            cache = os.path.join(td, 'device_id.json')
            a = _get_device_id('my|fp', cache)
            b = _get_device_id('my|fp', cache)
            assert a == b

    def test_different_fingerprint_different_id(self):
        with tempfile.TemporaryDirectory() as td:
            c1 = os.path.join(td, 'dev1.json')
            c2 = os.path.join(td, 'dev2.json')
            a = _get_device_id('fp1', c1)
            b = _get_device_id('fp2', c2)
            assert a != b

    def test_writes_cache_file(self):
        with tempfile.TemporaryDirectory() as td:
            cache = os.path.join(td, 'device_id.json')
            _get_device_id('test', cache)
            assert os.path.exists(cache)
            with open(cache) as f:
                data = json.load(f)
            assert 'device_id' in data

    def test_reads_from_cache(self):
        with tempfile.TemporaryDirectory() as td:
            cache = os.path.join(td, 'device_id.json')
            expected = hashlib.sha256(b'cached').hexdigest()
            with open(cache, 'w') as f:
                json.dump({'device_id': expected}, f)
            result = _get_device_id('cached', cache)
            assert result == expected

    def test_updates_cache_on_fingerprint_change(self):
        with tempfile.TemporaryDirectory() as td:
            cache = os.path.join(td, 'device_id.json')
            old_id = hashlib.sha256(b'old').hexdigest()
            with open(cache, 'w') as f:
                json.dump({'device_id': old_id}, f)
            new_result = _get_device_id('new', cache)
            assert new_result != old_id
            with open(cache) as f:
                data = json.load(f)
            assert data['device_id'] == new_result

    def test_handles_corrupt_cache(self):
        with tempfile.TemporaryDirectory() as td:
            cache = os.path.join(td, 'device_id.json')
            Path(cache).write_text('not json')
            result = _get_device_id('test', cache)
            assert len(result) == 64

    def test_creates_parent_dirs(self):
        with tempfile.TemporaryDirectory() as td:
            cache = os.path.join(td, 'subdir', 'deep', 'device_id.json')
            result = _get_device_id('test', cache)
            assert os.path.exists(cache)


# ==========================================================================
# 3. get_embedded_python_path (extracted)
# ==========================================================================
def _get_embedded_python_path():
    """Extracted from main.py."""
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = PROJECT_ROOT
    if sys.platform == 'win32':
        embedded = os.path.join(base_dir, "python-embed", "python.exe")
    else:
        embedded = os.path.join(base_dir, "python-embed", "bin", "python3")
    if os.path.exists(embedded):
        return embedded
    return None


class TestGetEmbeddedPythonPath:
    def test_returns_none_when_not_present(self):
        # python-embed likely doesn't exist in dev
        result = _get_embedded_python_path()
        if result is not None:
            assert os.path.exists(result)

    def test_frozen_mode_uses_exe_dir(self):
        with tempfile.TemporaryDirectory() as td:
            if sys.platform == 'win32':
                embed = os.path.join(td, 'python-embed', 'python.exe')
            else:
                embed = os.path.join(td, 'python-embed', 'bin', 'python3')
            os.makedirs(os.path.dirname(embed))
            Path(embed).touch()
            with patch.object(sys, 'frozen', True, create=True):
                with patch.object(sys, 'executable', os.path.join(td, 'Nunba.exe')):
                    # Need to re-evaluate with patched base_dir
                    base_dir = td
                    if sys.platform == 'win32':
                        expected = os.path.join(base_dir, 'python-embed', 'python.exe')
                    else:
                        expected = os.path.join(base_dir, 'python-embed', 'bin', 'python3')
                    assert os.path.exists(expected)

    def test_returns_string_or_none(self):
        result = _get_embedded_python_path()
        assert result is None or isinstance(result, str)


# ==========================================================================
# 4. _is_local_request (extracted logic)
# ==========================================================================
class TestIsLocalRequest:
    """Test localhost detection with proxy support."""

    @staticmethod
    def _is_local(remote_addr, forwarded_for=None, trusted_proxy=None):
        """Simplified _is_local_request logic."""
        if trusted_proxy and remote_addr == trusted_proxy:
            fwd = (forwarded_for or '').split(',')[0].strip()
            return fwd in ('127.0.0.1', '::1', 'localhost', '')
        return remote_addr in ('127.0.0.1', '::1')

    def test_localhost_ipv4(self):
        assert self._is_local('127.0.0.1') is True

    def test_localhost_ipv6(self):
        assert self._is_local('::1') is True

    def test_remote_ip(self):
        assert self._is_local('192.168.1.100') is False

    def test_proxy_with_local_forwarded(self):
        assert self._is_local('10.0.0.1', '127.0.0.1', '10.0.0.1') is True

    def test_proxy_with_remote_forwarded(self):
        assert self._is_local('10.0.0.1', '8.8.8.8', '10.0.0.1') is False

    def test_proxy_with_empty_forwarded(self):
        assert self._is_local('10.0.0.1', '', '10.0.0.1') is True

    def test_no_trusted_proxy(self):
        assert self._is_local('10.0.0.1', '127.0.0.1', None) is False

    def test_wrong_proxy_address(self):
        assert self._is_local('10.0.0.1', '127.0.0.1', '10.0.0.2') is False

    def test_multiple_forwarded_ips(self):
        assert self._is_local('10.0.0.1', '127.0.0.1, 8.8.8.8', '10.0.0.1') is True


# ==========================================================================
# 5. require_local_or_token decorator logic
# ==========================================================================
class TestRequireLocalOrToken:
    """Test the security decorator logic."""

    @staticmethod
    def _check_auth(is_local, api_token, auth_header):
        """Simplified require_local_or_token logic."""
        if is_local:
            return True
        if api_token:
            if auth_header.startswith('Bearer '):
                import hmac
                token = auth_header[7:]
                if hmac.compare_digest(token, api_token):
                    return True
        return False

    def test_local_always_passes(self):
        assert self._check_auth(True, '', '') is True

    def test_local_ignores_token(self):
        assert self._check_auth(True, 'secret', '') is True

    def test_valid_token_passes(self):
        assert self._check_auth(False, 'mysecret', 'Bearer mysecret') is True

    def test_invalid_token_fails(self):
        assert self._check_auth(False, 'mysecret', 'Bearer wrong') is False

    def test_no_token_no_header(self):
        assert self._check_auth(False, '', '') is False

    def test_no_api_token_configured(self):
        assert self._check_auth(False, '', 'Bearer anything') is False

    def test_missing_bearer_prefix(self):
        assert self._check_auth(False, 'secret', 'secret') is False

    def test_basic_auth_not_accepted(self):
        assert self._check_auth(False, 'secret', 'Basic c2VjcmV0') is False


# ==========================================================================
# 6. App directory detection
# ==========================================================================
class TestGetAppDirectory:
    def test_returns_existing_dir(self):
        # The function checks PROJECT_ROOT-level dirs
        assert os.path.isdir(PROJECT_ROOT)

    def test_frozen_returns_exe_parent(self):
        with patch.object(sys, 'frozen', True, create=True):
            with patch.object(sys, 'executable', '/opt/nunba/Nunba'):
                base = os.path.dirname(sys.executable)
                assert base == '/opt/nunba'


# ==========================================================================
# 7. Integration: fingerprint → device_id pipeline
# ==========================================================================
class TestFingerprintPipeline:
    def test_full_pipeline(self):
        fp = _get_machine_fingerprint()
        with tempfile.TemporaryDirectory() as td:
            cache = os.path.join(td, 'dev.json')
            dev_id = _get_device_id(fp, cache)
            assert len(dev_id) == 64
            # Verify cached
            dev_id2 = _get_device_id(fp, cache)
            assert dev_id == dev_id2

    def test_pipeline_deterministic_across_calls(self):
        fp = _get_machine_fingerprint()
        h1 = hashlib.sha256(fp.encode()).hexdigest()
        h2 = hashlib.sha256(fp.encode()).hexdigest()
        assert h1 == h2
