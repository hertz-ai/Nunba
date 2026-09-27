"""POST /api/vault/store: what the owner types reaches the tools, and never
becomes configuration.

The consent card stores a credential the agent asked for (HARTOS
hartos.ai_key_vault.request_credential) through this route.  When the site
rejects it, the agent asks again and the owner types the right one.

A value entered for an agent lives in the vault.  The desktop vault hands it
to HARTOS's vault (hold_credential), where {{secret:NAME}} resolves to it
once the card's grant names it; it never enters os.environ.  Only a name the
process legitimately reads from its environment (hartos.ai_key_vault
.reads_from_env: security.secrets_manager.SECRET_KEYS and the channel
adapters' env names) is also put there.  Before, export_to_env setdefault()ed
every tool key, so a first card entry for an unset NUNBA_CI or HTTPS_PROXY
became configuration (review of 670aed3f).

This runs the real route against a sandboxed desktop vault; HARTOS's vault is
the boundary, faked with what it holds and which names the owner entered.
"""
import os

import pytest
from flask import Flask

# Names these tests put in the environment, restored by monkeypatch.
_ENV_NAMES = ('SITE_PASSWORD', 'NEWS_API_KEY', 'NUNBA_CI', 'HTTPS_PROXY')


class _PlainFernet:
    def __init__(self, key=None):
        pass

    def encrypt(self, data):
        return b'ENC:' + data

    def decrypt(self, token):
        return token[4:]


class _HartosVault:
    """The HARTOS AIKeyVault surface the route and export_to_env use."""

    def __init__(self, owner_names):
        self.owner_names = owner_names
        self.held = {}

    def owner_credential_names(self):
        return set(self.owner_names)

    def hold_credential(self, name, value):
        self.held[name] = value


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
    for name in _ENV_NAMES:
        monkeypatch.delenv(name, raising=False)
    owner_names = set()
    hartos = _HartosVault(owner_names)
    import hartos.ai_key_vault as hartos_vault
    monkeypatch.setattr(hartos_vault, 'get_ai_key_vault', lambda: hartos)
    from routes.chatbot_routes import vault_store
    app = Flask(__name__)

    def store(value, key_name='SITE_PASSWORD'):
        with app.test_request_context(
                '/api/vault/store', method='POST',
                json={'key_type': 'tool_key', 'key_name': key_name,
                      'value': value}):
            return vault_store()

    store.owner_names = owner_names
    store.hartos = hartos
    yield store
    AIKeyVault.reset()


@pytest.mark.parametrize('name', ['SITE_PASSWORD', 'NUNBA_CI', 'HTTPS_PROXY'])
def test_a_card_entry_never_reaches_the_environment(vault_route, name):
    """The first entry is the gap: nothing held the name, so export_to_env's
    setdefault put it in os.environ.  NUNBA_CI=1 there makes HARTOS trust
    every origin."""
    vault_route('1', key_name=name)
    assert name not in os.environ
    assert vault_route.hartos.held[name] == '1'

    vault_route.owner_names.add(name)              # the card's grant
    vault_route('2', key_name=name)                # the re-ask after a rejection
    assert name not in os.environ
    assert vault_route.hartos.held[name] == '2'


def test_a_second_store_replaces_the_value_tools_read(vault_route):
    vault_route('wrong-password')
    vault_route.owner_names.add('SITE_PASSWORD')
    vault_route('right-password')
    assert vault_route.hartos.held['SITE_PASSWORD'] == 'right-password'

    from desktop.ai_key_vault import AIKeyVault
    assert AIKeyVault.get_instance().get_tool_key('SITE_PASSWORD') == 'right-password'


def test_a_name_the_process_reads_from_env_still_reaches_it(vault_route):
    vault_route('news-DUMMY', key_name='NEWS_API_KEY')
    assert os.environ['NEWS_API_KEY'] == 'news-DUMMY'


@pytest.mark.parametrize('name', ['PATH', 'HTTPS_PROXY', 'NUNBA_CI'])
def test_the_card_flow_never_replaces_a_setting(vault_route, monkeypatch, name):
    """Review of 670aed3f (High): a card for PATH granted secret:PATH, the
    site rejected it, the owner typed again, and PATH was replaced."""
    before = os.environ.get(name, 'system-value')
    monkeypatch.setenv(name, before)

    vault_route('typed-once', key_name=name)
    vault_route.owner_names.add(name)
    vault_route('typed-again', key_name=name)
    assert os.environ[name] == before


def test_a_re_entered_env_name_replaces_what_this_vault_put_there(vault_route):
    vault_route('first', key_name='NEWS_API_KEY')
    vault_route.owner_names.add('NEWS_API_KEY')
    vault_route('second', key_name='NEWS_API_KEY')
    assert os.environ['NEWS_API_KEY'] == 'second'


def test_a_value_changed_by_someone_else_is_not_replaced(vault_route, monkeypatch):
    vault_route('first', key_name='NEWS_API_KEY')
    vault_route.owner_names.add('NEWS_API_KEY')
    monkeypatch.setenv('NEWS_API_KEY', 'set-by-something-else')
    vault_route('second', key_name='NEWS_API_KEY')
    assert os.environ['NEWS_API_KEY'] == 'set-by-something-else'


def test_a_name_that_is_not_an_owner_credential_is_not_replaced_even_if_ours(vault_route):
    """Both conditions hold: the vault's own earlier value is not enough
    when the name is not one the owner entered for an agent."""
    vault_route('first', key_name='NEWS_API_KEY')     # export_to_env: unset -> 'first'
    vault_route('second', key_name='NEWS_API_KEY')    # never granted on a card
    assert os.environ['NEWS_API_KEY'] == 'first'


def test_when_hartos_cannot_be_read_nothing_reaches_the_environment(vault_route, monkeypatch):
    import hartos.ai_key_vault as hartos_vault

    def broken():
        raise RuntimeError('consent db locked')
    monkeypatch.setattr(hartos_vault, 'get_ai_key_vault', broken)
    monkeypatch.setenv('NEWS_API_KEY', 'old')
    vault_route('new', key_name='NEWS_API_KEY')
    assert os.environ['NEWS_API_KEY'] == 'old'
    vault_route('card-value', key_name='NUNBA_CI')
    assert 'NUNBA_CI' not in os.environ
