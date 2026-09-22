"""The floating marker is one fact in two languages, and it CANNOT leak.

``desktop/companion_surface.py`` holds the marker in Python;
``landing-page/public/index.html`` holds a reader for it in JavaScript and
rules keyed off it in CSS.  A static HTML file cannot import Python, so that
literal is genuinely written twice.  These tests are what stops the two
copies drifting, and what makes "it will not interfere with the main window"
a measured property rather than a claim.

The non-interference argument, stated so a reader can check it:

    every new rule in index.html is scoped to
    :root[data-hart-surface='floating'], and the ONLY thing that sets that
    attribute is a script that requires the marker in the URL, and the only
    URL that carries the marker is the one companion_url() builds.

So a document that is not the floating companion cannot match any of them.
The tests below check each link of that chain separately, because a chain
asserted as a whole is a chain nobody can debug.
"""
from __future__ import annotations

import pathlib
import re

import pytest

REPO = pathlib.Path(__file__).resolve().parent.parent
INDEX = REPO / 'landing-page' / 'public' / 'index.html'

from desktop.companion_surface import (  # noqa: E402
    COMPANION_PATH,
    FLOATING_PARAM,
    FLOATING_QUERY,
    FLOATING_VALUE,
    SURFACE_ATTRIBUTE,
    companion_url,
    is_floating_url,
)


@pytest.fixture(scope='module')
def html() -> str:
    return INDEX.read_text(encoding='utf-8')


# ── the two copies of the one literal ───────────────────────────────────

def test_the_html_reader_matches_the_python_marker(html):
    """index.html's regex must accept exactly what companion_url() emits.

    Checked by RUNNING the regex against the real URL rather than by eyeing
    the two strings: a reader that is subtly wrong (a missing `?`, a `.`
    that should be escaped) would pass a string comparison and still fail on
    the only input that matters.
    """
    match = re.search(r'/\[\?&\](.+?)/\.test\(window\.location\.search\)',
                      html)
    assert match, ('index.html no longer tests window.location.search for '
                   'the marker; the floating page cannot know what it is')

    pattern = re.compile(r'[?&]' + match.group(1))
    url = companion_url(5000)
    query = url.split('?', 1)[1]
    assert pattern.search('?' + query), (
        'the reader in index.html does not match the URL '
        f'companion_surface.companion_url() builds: {match.group(1)!r} vs {query!r}')


def test_an_ordinary_url_is_not_read_as_floating(html):
    """The reader must REJECT the main window's URL.

    Without this the guard would be vacuous: a regex that matches everything
    also matches the companion, and every test above would still pass while
    the main window quietly took the floating branch.
    """
    match = re.search(r'/\[\?&\](.+?)/\.test\(window\.location\.search\)',
                      html)
    pattern = re.compile(r'[?&]' + match.group(1))
    for ordinary in ('', '?', '?lang=en', '?surface=embedded',
                     '?notsurface=floating', '?surface=floatingish'):
        assert not pattern.search(ordinary), (
            f'{ordinary!r} would be read as the floating companion')


def test_the_attribute_name_is_the_one_the_css_keys_off(html):
    """One attribute name, spelled the same in the setter and the rules."""
    assert f"'{SURFACE_ATTRIBUTE}'," in html or \
           f'"{SURFACE_ATTRIBUTE}",' in html, (
        f'index.html does not set {SURFACE_ATTRIBUTE}; the CSS below it can never match')
    assert f":root[{SURFACE_ATTRIBUTE}='{FLOATING_VALUE}']" in html, (
        f'no CSS rule is keyed off {SURFACE_ATTRIBUTE}={FLOATING_VALUE}')


# ── non-interference with the main window ───────────────────────────────

def _floating_rules(html: str):
    """Every selector block introduced for the floating surface."""
    return re.findall(rf'(:root\[{SURFACE_ATTRIBUTE}[^{{]*)\{{([^}}]*)\}}',
                      html)


def test_every_new_rule_is_scoped_to_the_floating_surface(html):
    """Nothing the companion needs may be reachable by the main window.

    The property that makes this change safe, checked directly: each rule
    added for the floating case carries the attribute selector on EVERY
    comma-separated selector in its list, not merely on the first one.  A
    list like `:root[...] body, #root { ... }` reads as scoped and is not --
    the second selector matches every document in the app.
    """
    blocks = _floating_rules(html)
    assert blocks, 'no floating-scoped rules found at all'

    for selector_list, body in blocks:
        for selector in selector_list.split(','):
            selector = selector.strip()
            if not selector:
                continue
            assert selector.startswith(f':root[{SURFACE_ATTRIBUTE}'), (
                f'selector {selector!r} in the floating block {{ {body.strip()} }} is NOT scoped to '
                'the floating surface, so it applies to the main window too')


def test_the_main_window_keeps_its_inline_black(html):
    """<body> and #root must still carry their inline background.

    Deliberately NOT refactored into the stylesheet.  Moving them would let a
    later-loaded rule in the app's own CSS start winning against them, and
    the main window's background would change for a reason unrelated to the
    companion.  The inline attributes staying put is what makes the main
    window bit-for-bit unchanged by this work.
    """
    assert re.search(r'<body[^>]*style="background: black"', html), (
        "the main window's <body> lost its inline background")
    assert 'style="background: black; min-height: 100vh" id="root"' in html, (
        "the main window's #root lost its inline background")


def test_the_floating_overrides_can_actually_beat_those_inline_styles(html):
    """...which is exactly why they need !important, so require it.

    An inline style attribute outranks any stylesheet rule that is not
    !important.  Without it these rules would be inert on <body> and #root --
    present, plausible-looking, and doing nothing.  That is the vacuous-fix
    shape, so it gets its own assertion.
    """
    for selector_list, body in _floating_rules(html):
        if 'background' not in body:
            continue
        targets = selector_list.replace(f':root[{SURFACE_ATTRIBUTE}=\'{FLOATING_VALUE}\']',
                                        '')
        if 'body' in targets or '#root' in targets:
            assert '!important' in body, (
                f'the floating background override for {selector_list.strip()} is not !important, '
                'so the inline style on the element wins and the rule does '
                'nothing')


# ── the URL helpers ─────────────────────────────────────────────────────

def test_the_companion_url_always_carries_the_marker():
    url = companion_url(5000)
    assert COMPANION_PATH in url
    assert FLOATING_QUERY in url
    assert is_floating_url(url)


def test_is_floating_url_rejects_the_main_window():
    assert not is_floating_url('http://localhost:5000/local')
    assert not is_floating_url('http://localhost:5000/voice-orb')
    assert not is_floating_url('')
    assert not is_floating_url(None)


def test_the_marker_halves_agree_with_the_query():
    assert FLOATING_QUERY == f'{FLOATING_PARAM}={FLOATING_VALUE}'


# ── app.py is the caller, and it must use the helper ────────────────────

def test_app_py_builds_the_companion_url_through_the_helper():
    """No hand-rolled URL for the companion window.

    A literal f-string there would silently drop the marker and put the black
    rectangle back, three files away from anything that looks related.
    """
    app = (REPO / 'app.py').read_text(encoding='utf-8')
    assert 'companion_url(' in app, (
        'app.py no longer builds the companion URL through '
        'companion_surface.companion_url')
    assert not re.search(r'_comp_url\s*=\s*f?["\']http', app), (
        'app.py builds the companion URL from a literal again; the floating '
        'marker will be missing')


def test_the_companion_window_is_not_given_an_inert_background_color():
    """background_color is dead on the transparent branch -- keep it gone.

    MEASURED in the bundled pywebview 6.1 (winforms.py:268-274): the kwarg is
    read only on the `else` of `if window.transparent and self.browser`, and
    glass_window_kwargs() returns transparent=True on all three platforms.
    The '#000000' that used to sit there did nothing while reading like a
    deliberate choice to paint the floating window black.
    """
    from desktop.companion_surface import companion_window_kwargs

    kwargs = companion_window_kwargs()
    assert 'background_color' not in kwargs
    assert kwargs.get('transparent') is True, (
        'without transparent=True pywebview WOULD read background_color, and '
        'this test stops meaning what it says'
    )
