#!/usr/bin/env python3
"""Generate Nunba splash.png from splash.svg using headless Chromium.
This ensures all Indic scripts (Tamil, Devanagari, Bengali, Telugu, etc.)
render with proper complex text shaping via the browser's HarfBuzz engine.

The PNG keeps the SVG's ALPHA (GL4, HOME_DESKTOP_DESIGN_CHECKLIST.md in
HARTOS): the page behind the SVG is transparent and the screenshot omits it,
so the splash's see-through background survives into the file and
desktop/glass.apply_image_alpha can show the desktop through it.

    python scripts/gen_splash.py [--channel msedge]

--channel picks an installed Chromium-family browser (msedge, chrome) when
Playwright's own Chromium is not downloaded; the text shaping is the same
HarfBuzz either way.
"""
import argparse
import os

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
SVG_PATH = os.path.join(PROJECT_ROOT, 'splash.svg')
PNG_PATH = os.path.join(PROJECT_ROOT, 'splash.png')

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('--channel', default=None,
                help='installed browser channel (msedge, chrome)')
args = ap.parse_args()

# Build a minimal HTML page that displays the SVG at exact size, over NOTHING:
# a painted page background would be baked into every pixel the SVG leaves
# see-through.
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
        browser = p.chromium.launch(channel=args.channel)
        page = browser.new_page(viewport={'width': 960, 'height': 640})
        page.goto(f'file:///{html_path.replace(os.sep, "/")}')
        page.wait_for_timeout(500)  # let fonts load
        page.screenshot(path=PNG_PATH, type='png', omit_background=True)
        browser.close()
finally:
    # Clean up temp HTML
    os.remove(html_path)
print(f'Saved {PNG_PATH} (960x640, RGBA)')
