"""The routes production adds AFTER ``import main``, for the tests that look for them.

``import main`` builds the Flask app with its own routes only.  The social API
(``/api/social/auth/login``, ``/feed``, ``/posts`` ...), the books routes
(``/upload/parse_pdf``) and Nunba's consumer routes (``/upload/image``,
``/upload/audio``, ``/upload/file``, ``/upload/vision``, kids media, db routes)
arrive later: HARTOS's bootstrap calls ``main._register_nunba_consumer_routes``
and its own blueprint registration from a deferred thread, inside the
setup-lock-bypass window (main.py, "Regression guard" comment above
``_register_nunba_consumer_routes``).  A test that reads ``main.app.url_map`` or
posts to one of those URLs straight after the import therefore sees none of them.

This builds a THROWAWAY app carrying exactly those registrations, so a test can
ask what production serves without registering anything on ``main.app`` (which
would leak into every other test in the process).
"""
from flask import Flask


def deferred_routes_app() -> Flask:
    """A fresh Flask app with the deferred registrations of ``main`` applied.

    A registration that cannot be made here (a dependency of that blueprint is
    missing) is skipped, as it is in production, where each one is guarded; the
    test that needs the route then fails on the route, not on this helper.
    """
    import main

    app = Flask('deferred_routes')
    app.config['TESTING'] = True
    main._register_nunba_consumer_routes(app)
    for module, name in (('integrations.social', 'social_bp'),
                         ('integrations.learning.api_books', 'books_bp')):
        try:
            blueprint = getattr(__import__(module, fromlist=[name]), name)
            app.register_blueprint(blueprint)
        except Exception:  # noqa: BLE001 - mirrors the guarded production registration
            pass
    return app
