"""POST /api/vault/store replaces a tool key in os.environ.

The consent card stores a credential the agent asked for (HARTOS
hartos.ai_key_vault.request_credential) through this route.  When the site
rejects it, the agent asks again and the owner types the right one.  Tools read
the value from os.environ (HARTOS resolve_aliases -> SecretsManager.get_secret),
and export_to_env only setdefault()s, so the rejected value used to stay in
the process until a restart.  This runs the real route against a sandboxed
vault.
"""
import os

import pytest
from flask import Flask


class _PlainFernet:
    def __init__(self, key=None):
        pass

    def encrypt(self, data):
        return b'ENC:' + data

    def decrypt(self, token):
        return token[4:]


@pytest.fixture
def vault_route(tmp_path, monkeypatch):
    nunba_dir = tmp_path / '.nunba'
    nunba_dir.mkdir()
    monkeypatch.setattr('desktop.ai_key_vault._NUNBA_DIR', nunba_dir)
    monkeypatch.setattr('desktop.ai_key_vault._VAULT_PATH', nunba_dir / 'ai_keys.enc')
    monkeypatch.setattr('desktop.ai_key_vault._SALT_PATH', nunba_dir / 'vault.salt')
    monkeypatch.setattr('desktop.ai_key_vault._derive_fernet_key',
                        lambda salt: _PlainFernet(salt))
    from desktop.ai_key_vault import AIKeyVault
    AIKeyVault.reset()
    monkeypatch.delenv('SITE_PASSWORD', raising=False)
    from routes.chatbot_routes import vault_store
    app = Flask(__name__)

    def store(value):
        with app.test_request_context(
                '/api/vault/store', method='POST',
                json={'key_type': 'tool_key', 'key_name': 'SITE_PASSWORD',
                      'value': value}):
            return vault_store()

    yield store
    AIKeyVault.reset()
    os.environ.pop('SITE_PASSWORD', None)


def test_a_second_store_replaces_the_value_tools_read(vault_route):
    vault_route('wrong-password')
    assert os.environ['SITE_PASSWORD'] == 'wrong-password'

    vault_route('right-password')
    assert os.environ['SITE_PASSWORD'] == 'right-password'

    from desktop.ai_key_vault import AIKeyVault
    assert AIKeyVault.get_instance().get_tool_key('SITE_PASSWORD') == 'right-password'
