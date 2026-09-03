"""Prove each arcade game ANIMATES, by comparing its before/after screenshots.

This is the artifact-mediated half of the game play-through. The in-browser
check (countAnimationFrames) proves a loop is running; this proves the PICTURE
actually changed after we sent input.

Why not do it in the browser: Phaser runs on WebGL (Phaser.AUTO) and does not
preserve the drawing buffer, so canvas.toDataURL() returns a blank, stable
image even while the game is visibly animating. Trusting it produced five
false failures whose own screenshots showed the games working, plus two false
passes where toDataURL threw and the assertion was skipped. The screenshots are
the artifact; compare those.

Usage:  python scripts/compare_game_frames.py [screenshots_dir]
Exit 0 if every pair differs, 1 if any pair is identical (a frozen game).
"""
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError:
    print("Pillow required:  pip install pillow")
    sys.exit(2)

DEFAULT_DIR = Path(__file__).resolve().parents[1] / "cypress" / "screenshots" / "games-play-through.cy.js"
# Fraction of pixels that must differ for us to call it "animating".
MIN_CHANGED_FRACTION = 0.0005  # 0.05% — a moving snake segment is small


def changed_fraction(a: Path, b: Path) -> float:
    """Fraction of pixels that differ between two screenshots."""
    with Image.open(a) as ia, Image.open(b) as ib:
        ia = ia.convert("RGB")
        ib = ib.convert("RGB")
        if ia.size != ib.size:
            return 1.0  # different size is certainly a change
        diff = ImageChops.difference(ia, ib)
        bbox = diff.getbbox()
        if bbox is None:
            return 0.0
        # Count pixels whose combined channel delta is non-trivial.
        changed = sum(1 for px in diff.getdata() if px[0] + px[1] + px[2] > 12)
        return changed / float(ia.size[0] * ia.size[1])


def main() -> int:
    d = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DIR
    if not d.is_dir():
        print(f"screenshots dir not found: {d}")
        return 2

    pairs = []
    for before in sorted(d.glob("arcade-*-1-before.png")):
        game = before.name[len("arcade-"):-len("-1-before.png")]
        after = d / f"arcade-{game}-2-after.png"
        if after.exists():
            pairs.append((game, before, after))

    if not pairs:
        print(f"no before/after arcade pairs in {d}")
        return 2

    print(f"{'game':<18} {'changed px':>11}   verdict")
    print("-" * 46)
    frozen = []
    for game, b, a in pairs:
        frac = changed_fraction(b, a)
        ok = frac >= MIN_CHANGED_FRACTION
        if not ok:
            frozen.append(game)
        print(f"{game:<18} {frac*100:>10.3f}%   {'ANIMATING' if ok else 'FROZEN'}")

    print()
    if frozen:
        print(f"FROZEN (picture identical after input): {', '.join(frozen)}")
        return 1
    print(f"All {len(pairs)} arcade games animated between before and after.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
