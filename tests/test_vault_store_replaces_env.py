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
    # HARTOS AIKeyVault.owner_credential_names is the boundary: the names of
    # the credentials the owner entered for an agent (granted 'credential'
    # consent rows).  The route asks it before replacing an env value.
    owner_names = set()
    import hartos.ai_key_vault as hartos_vault
    monkeypatch.setattr(hartos_vault, 'get_ai_key_vault', lambda: type(
        'V', (), {'owner_credential_names': lambda self: set(owner_names)})())
    from routes.chatbot_routes import vault_store
    app = Flask(__name__)

    def store(value, key_name='SITE_PASSWORD'):
        with app.test_request_context(
                '/api/vault/store', method='POST',
                json={'key_type': 'tool_key', 'key_name': key_name,
                      'value': value}):
            return vault_store()

    store.owner_names = owner_names
    yield store
    AIKeyVault.reset()
    os.environ.pop('SITE_PASSWORD', None)


def test_a_second_store_replaces_the_value_tools_read(vault_route):
    vault_route('wrong-password')
    assert os.environ['SITE_PASSWORD'] == 'wrong-password'

    # The card granted the first entry, so the name is an owner credential.
    vault_route.owner_names.add('SITE_PASSWORD')
    vault_route('right-password')
    assert os.environ['SITE_PASSWORD'] == 'right-password'

    from desktop.ai_key_vault import AIKeyVault
    assert AIKeyVault.get_instance().get_tool_key('SITE_PASSWORD') == 'right-password'


@pytest.mark.parametrize('name', ['PATH', 'NUNBA_CI_TEST_GUARD'])
def test_a_name_that_is_not_an_owner_credential_never_replaces_the_environment(
        vault_route, monkeypatch, name):
    """/api/vault/store used to set os.environ[key_name] for any key_name, so
    a POST with key_name PATH replaced PATH for the whole process."""
    # setenv either way, so monkeypatch puts it back even if the route breaks it.
    before = os.environ.get(name, 'the-process-value')
    monkeypatch.setenv(name, before)
    vault_route.owner_names.add('SITE_PASSWORD')

    vault_route('attacker-value', key_name=name)
    assert os.environ[name] == before


@pytest.mark.parametrize('name', ['PATH', 'HTTPS_PROXY', 'NUNBA_CI'])
def test_the_card_flow_never_replaces_a_setting(vault_route, monkeypatch, name):
    """Review of 670aed3f (High): the owner types a value for PATH on the
    card, the card grants secret:PATH (so PATH is an owner credential), the
    site rejects it, the owner types again: the second store replaced
    os.environ['PATH'].  The env value is replaced only while it is unset or
    still the value this vault stored."""
    before = os.environ.get(name, 'system-value')
    monkeypatch.setenv(name, before)

    vault_route('typed-once', key_name=name)
    vault_route.owner_names.add(name)              # the card's grant
    vault_route('typed-again', key_name=name)      # the re-ask after a rejection
    assert os.environ[name] == before


def test_a_value_changed_by_someone_else_is_not_replaced(vault_route, monkeypatch):
    vault_route('first-password')
    vault_route.owner_names.add('SITE_PASSWORD')
    monkeypatch.setenv('SITE_PASSWORD', 'set-by-something-else')
    vault_route('second-password')
    assert os.environ['SITE_PASSWORD'] == 'set-by-something-else'


def test_a_first_entry_still_reaches_the_tools(vault_route):
    """The first value for a credential is stored before its first grant, so
    it is not an owner credential yet; nothing holds the name, and the value
    still reaches the tools (export_to_env)."""
    vault_route('first-password')
    assert os.environ['SITE_PASSWORD'] == 'first-password'


def test_a_name_that_is_not_an_owner_credential_is_not_replaced_even_if_ours(vault_route):
    """Both conditions hold: the vault's own earlier value is not enough
    when the name is not one the owner entered for an agent."""
    vault_route('first')                      # export_to_env: unset -> 'first'
    vault_route('second')                     # never granted on a card
    assert os.environ['SITE_PASSWORD'] == 'first'


def test_when_the_owner_list_cannot_be_read_nothing_is_replaced(vault_route, monkeypatch):
    import hartos.ai_key_vault as hartos_vault

    def broken():
        raise RuntimeError('consent db locked')
    monkeypatch.setattr(hartos_vault, 'get_ai_key_vault', broken)
    monkeypatch.setenv('SITE_PASSWORD', 'old')
    vault_route('new')
    assert os.environ['SITE_PASSWORD'] == 'old'
