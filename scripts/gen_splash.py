#!/usr/bin/env python3
"""Generate Nunba splash.png from splash.svg using headless Chromium.
This ensures all Indic scripts (Tamil, Devanagari, Bengali, Telugu, etc.)
render with proper complex text shaping via the browser's HarfBuzz engine.

The PNG keeps the SVG's ALPHA (GL4, HOME_DESKTOP_DESIGN_CHECKLIST.md in
HARTOS): the page behind the SVG is transparent and the screenshot omits it,
so the splash's see-through background survives into the file and
desktop/glass.apply_image_alpha can show the desktop through it.

How see-through is not typed here or in the SVG: it is app.py's
``_SPLASH_OPACITY``, the ONE value both splashes use.  This script stamps it
onto splash.svg's backdrop group before rendering, then reads the rendered
PNG back and refuses a backdrop alpha that is not that value.
tests/test_splash_opacity_one_source.py fails when either file drifts.

    python scripts/gen_splash.py [--channel msedge] [--png OUT.png]

--channel picks an installed Chromium-family browser (msedge, chrome) when
Playwright's own Chromium is not downloaded; the text shaping is the same
HarfBuzz either way.
"""
import argparse
import ast
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
SVG_PATH = os.path.join(PROJECT_ROOT, 'splash.svg')
PNG_PATH = os.path.join(PROJECT_ROOT, 'splash.png')
APP_PATH = os.path.join(PROJECT_ROOT, 'app.py')

_OPACITY_NAME = '_SPLASH_OPACITY'
_BACKDROP_RE = re.compile(r'(<g id="backdrop" opacity=")([^"]*)(")')


def splash_opacity(app_path=APP_PATH):
    """The ONE splash opacity: ``_SPLASH_OPACITY`` in app.py.

    Read by AST, because importing app.py boots the desktop app.
    """
    with open(app_path, encoding='utf-8') as f:
        tree = ast.parse(f.read())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
                getattr(t, 'id', None) == _OPACITY_NAME for t in node.targets):
            return float(ast.literal_eval(node.value))
    raise LookupError(f'{app_path} defines no {_OPACITY_NAME}')


def _fmt(opacity):
    """Two decimals when exact (the file's own style), else the full value."""
    text = f'{opacity:.2f}'
    return text if float(text) == opacity else repr(float(opacity))


def stamp_backdrop_opacity(svg_text, opacity):
    """``svg_text`` with its ONE backdrop group's opacity set to ``opacity``.

    Raises ValueError unless exactly one backdrop group is found: a stamp
    that did not land must never render as if it had.
    """
    stamped, n = _BACKDROP_RE.subn(
        lambda m: m.group(1) + _fmt(opacity) + m.group(3), svg_text)
    if n != 1:
        raise ValueError(f'expected one backdrop group, found {n}')
    return stamped


def png_backdrop_alpha(png_path):
    """The see-through backdrop's alpha in a rendered splash PNG.

    The backdrop is most of the canvas, so it is the most common alpha that is
    neither fully clear nor fully solid (the artwork is solid).
    """
    from PIL import Image
    hist = Image.open(png_path).convert('RGBA').getchannel('A').histogram()
    return max(range(1, 255), key=lambda a: hist[a])


def _render(channel, png_path):
    from playwright.sync_api import sync_playwright

    # A minimal HTML page that displays the SVG at exact size, over NOTHING:
    # a painted page background would be baked into every pixel the SVG
    # leaves see-through.
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* {{ margin:0; padding:0; }}
html, body {{ width:960px; height:640px; overflow:hidden; background:transparent; }}
img {{ width:960px; height:640px; display:block; }}
</style></head>
<body><img src="file:///{SVG_PATH.replace(os.sep, '/')}"></body></html>
"""
    html_path = os.path.join(HERE, '_splash_render.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel=channel)
            page = browser.new_page(viewport={'width': 960, 'height': 640})
            page.goto(f'file:///{html_path.replace(os.sep, "/")}')
            page.wait_for_timeout(500)  # let fonts load
            page.screenshot(path=png_path, type='png', omit_background=True)
            browser.close()
    finally:
        os.remove(html_path)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--channel', default=None,
                    help='installed browser channel (msedge, chrome)')
    ap.add_argument('--png', default=PNG_PATH,
                    help='where to write the PNG (default: splash.png)')
    args = ap.parse_args(argv)

    opacity = splash_opacity()
    with open(SVG_PATH, encoding='utf-8', newline='') as f:
        svg = f.read()
    stamped = stamp_backdrop_opacity(svg, opacity)
    if stamped != svg:
        with open(SVG_PATH, 'w', encoding='utf-8', newline='') as f:
            f.write(stamped)
        print(f'splash.svg backdrop opacity -> {_fmt(opacity)}')

    _render(args.channel, args.png)
    alpha = png_backdrop_alpha(args.png)
    print(f'Saved {args.png} (960x640, RGBA): backdrop alpha {alpha} '
          f'(target {255 * opacity:.1f} = {_OPACITY_NAME} {opacity})')
    if abs(alpha - 255 * opacity) > 1:
        print('FAIL: the rendered backdrop is not the one splash opacity')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
