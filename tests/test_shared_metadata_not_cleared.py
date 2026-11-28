"""The shared SQLAlchemy metadata must never be cleared at startup.

app.py's _import_main_app() used to import sql.models and then call
``Base.metadata.clear()``.  sql.models stays cached in sys.modules, so its
tables were never registered again; only classes defined afterwards (HARTOS's
SitePage) were.  Every ``create_all`` then failed with

    Foreign key associated with column 'site_pages.author_id' could not find
    table 'users' ...

which aborted HARTOS run_migrations before any column step, so an existing
user DB was never upgraded (installed build 1b55bfd: no notifications.read_at,
/api/social/notifications 500 every 30 s, no site_pages table).
"""
import ast
import os

import pytest

APP_PY = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app.py')


def test_app_py_never_clears_metadata():
    with open(APP_PY, encoding='utf-8') as fh:
        tree = ast.parse(fh.read(), filename=APP_PY)
    offenders = [
        node.lineno for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == 'clear'
        and isinstance(node.func.value, ast.Attribute)
        and node.func.value.attr == 'metadata'
    ]
    assert not offenders, f'app.py clears SQLAlchemy metadata at lines {offenders}'


def test_schema_creates_after_sql_models_then_hartos_facade():
    """The startup import order: sql.models first, then the HARTOS facade."""
    pytest.importorskip('sql.models')
    social_models = pytest.importorskip('integrations.social.models')
    from sqlalchemy import create_engine

    tables = social_models.Base.metadata.tables
    assert 'users' in tables
    assert 'notifications' in tables
    assert 'site_pages' in tables
    social_models.Base.metadata.create_all(create_engine('sqlite://'))
