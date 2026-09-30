"""One splash opacity, three places it shows up (GL4).

The owner's 2026-09-26 instruction: "static see-through is a lot, it should be
10% and same for animated".  The value lives ONCE, as ``_SPLASH_OPACITY`` in
app.py.  The animated splash hands it to glass.py at run time; the static
splash carries it baked into splash.png, rendered by scripts/gen_splash.py
from splash.svg after it stamps the value onto the backdrop group.  These
tests fail when either shipped file drifts from that one value, and pin the
stamping and measuring the generator does.

    python -m pytest tests/test_splash_opacity_one_source.py -q
"""
import ast
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT / 'scripts') not in sys.path:
    sys.path.insert(0, str(ROOT / 'scripts'))

import gen_splash  # noqa: E402

_SVG_NS = '{http://www.w3.org/2000/svg}'


def _svg_backdrop_opacity(svg_text):
    root = ET.fromstring(svg_text)
    groups = [g for g in root.iter(_SVG_NS + 'g') if g.get('id') == 'backdrop']
    assert len(groups) == 1, f'{len(groups)} backdrop groups in splash.svg'
    return float(groups[0].get('opacity'))


def test_the_one_value_is_the_owners_ten_percent():
    # Owner 2026-09-26: "it should be 10% and same for animated".
    assert 1 - gen_splash.splash_opacity() == pytest.approx(0.10)


def test_splash_opacity_reads_app_py_constant(tmp_path):
    app = tmp_path / 'app.py'
    app.write_text('X = 1\n_SPLASH_OPACITY = 0.75\n', encoding='utf-8')
    assert gen_splash.splash_opacity(str(app)) == 0.75


def test_splash_opacity_refuses_an_app_py_without_it(tmp_path):
    app = tmp_path / 'app.py'
    app.write_text('_ANIMATED_SPLASH_OPACITY = 0.9\n', encoding='utf-8')
    with pytest.raises(LookupError):
        gen_splash.splash_opacity(str(app))


def test_shipped_svg_backdrop_is_the_one_value():
    svg = (ROOT / 'splash.svg').read_text(encoding='utf-8')
    assert _svg_backdrop_opacity(svg) == gen_splash.splash_opacity()


def test_shipped_png_backdrop_alpha_is_the_one_value():
    # 8-bit alpha: the renderer rounds, so one step either way is the value.
    alpha = gen_splash.png_backdrop_alpha(str(ROOT / 'splash.png'))
    assert abs(alpha - 255 * gen_splash.splash_opacity()) <= 1


def test_png_backdrop_alpha_is_the_dominant_see_through_alpha(tmp_path):
    img = Image.new('RGBA', (30, 10), (10, 9, 20, 200))
    # Solid artwork and fully clear pixels each outnumber the backdrop here,
    # and an anti-aliased edge sits beside it: only the backdrop is the one.
    img.paste((255, 0, 0, 255), (0, 0, 12, 10))   # 120 px solid
    img.paste((0, 0, 0, 0), (12, 0, 22, 10))      # 100 px fully clear
    img.paste((1, 1, 1, 90), (22, 0, 23, 10))     # 10 px edge
    #                                               70 px backdrop at 200
    path = tmp_path / 'p.png'
    img.save(path)
    assert gen_splash.png_backdrop_alpha(str(path)) == 200


def test_stamp_rewrites_only_the_backdrop_group():
    svg = (ROOT / 'splash.svg').read_text(encoding='utf-8')
    stamped = gen_splash.stamp_backdrop_opacity(svg, 0.75)
    assert _svg_backdrop_opacity(stamped) == 0.75
    # nothing else in the file moved
    assert (stamped.replace('id="backdrop" opacity="0.75"', '')
            == svg.replace(f'id="backdrop" opacity="'
                           f'{gen_splash._fmt(gen_splash.splash_opacity())}"',
                           ''))


def test_stamp_keeps_the_shipped_text_when_the_value_is_unchanged():
    svg = (ROOT / 'splash.svg').read_text(encoding='utf-8')
    assert gen_splash.stamp_backdrop_opacity(
        svg, gen_splash.splash_opacity()) == svg


@pytest.mark.parametrize('svg', [
    '<svg><rect/></svg>',
    '<svg><g id="backdrop" opacity="0.5"/><g id="backdrop" opacity="0.5"/>'
    '</svg>',
])
def test_stamp_refuses_unless_exactly_one_backdrop(svg):
    with pytest.raises(ValueError):
        gen_splash.stamp_backdrop_opacity(svg, 0.9)


def test_source_guard_app_py_holds_one_splash_opacity():
    """A second opacity literal for either splash is the drift this closes."""
    tree = ast.parse((ROOT / 'app.py').read_text(encoding='utf-8'))
    names = [t.id for n in tree.body if isinstance(n, ast.Assign)
             for t in n.targets
             if isinstance(t, ast.Name) and 'SPLASH' in t.id
             and 'OPACITY' in t.id]
    assert names == ['_SPLASH_OPACITY']
