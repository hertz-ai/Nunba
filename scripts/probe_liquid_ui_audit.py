"""Liquid UI substrate audit.

Walks HARTOS + Nunba for every `agent_ui_update(...)` call site, extracts
the `'type': '<name>'` literal that follows, and compares against the
web SPA AgentOverlay switch + HARTOS COMPONENT_TYPES allowlist.

Goal: every type emitted to LiquidUIService must:
1. Be in COMPONENT_TYPES (HARTOS validates before publishing).
2. Have a renderer case in AgentOverlay.jsx (web SPA renders it).

Mismatches in either direction = unrendered or rejected UI emit.

Run-once verification per the active session goal: "all agentic liquid
ui in nunba shd work and should be verified for every other task".
"""
from __future__ import annotations

import pathlib
import re
import sys

_PRUNE_DIRS = {
    '.venv', 'venv', '__pycache__', 'build', 'dist',
    'agent-ledger-opensource', 'python-embed',
    'hallucinated_recipes_backup', '_archive', 'node_modules',
    '.git', 'site-packages', '.pytest_cache', '.mypy_cache',
    '.tox', '.eggs', 'docs', 'logs', 'agent_data',
}


def scan_emit_sites(root: pathlib.Path):
    """Walk with os.walk and prune unwanted dirs in-place — orders of
    magnitude faster than rglob() over a 20k-file tree."""
    import os
    sites = []
    for dirpath, dirnames, filenames in os.walk(str(root)):
        # Prune in-place so os.walk doesn't recurse into noise.
        dirnames[:] = [d for d in dirnames if d not in _PRUNE_DIRS]
        for fn in filenames:
            if not fn.endswith('.py'):
                continue
            full = os.path.join(dirpath, fn)
            try:
                with open(full, encoding='utf-8', errors='replace') as f:
                    # Quick contains-check before full regex.
                    head = f.read()
            except OSError:
                continue
            if 'agent_ui_update' not in head:
                continue
            for m in re.finditer(r'agent_ui_update\s*\(', head):
                chunk = head[m.start():m.start() + 1500]
                tm = re.search(r"'type':\s*'([a-z_]+)'", chunk)
                if tm:
                    sites.append((full, tm.group(1)))
    return sites


def parse_component_types(svc_path: pathlib.Path) -> set[str]:
    if not svc_path.exists():
        return set()
    t = svc_path.read_text(encoding='utf-8', errors='replace')
    m = re.search(r'COMPONENT_TYPES\s*=\s*\{(.*?)\n\}', t, re.S)
    if not m:
        return set()
    return set(re.findall(r"'([a-z_]+)'\s*:\s*\{", m.group(1)))


def parse_switch_cases(overlay_path: pathlib.Path) -> set[str]:
    if not overlay_path.exists():
        return set()
    t = overlay_path.read_text(encoding='utf-8', errors='replace')
    # Accept both: `case 'foo': return <X />;` and
    # `case 'foo': { ... return <X /> }` (block form).
    return set(re.findall(r"case '([a-z_]+)':\s*[{\n\s]*", t))


def main() -> int:
    hart = pathlib.Path('C:/Users/sathi/PycharmProjects/HARTOS')
    nunba = pathlib.Path('C:/Users/sathi/PycharmProjects/Nunba-HART-Companion')
    sites = scan_emit_sites(hart) + scan_emit_sites(nunba)

    emitted: dict[str, set[str]] = {}
    for path, ty in sites:
        emitted.setdefault(ty, set()).add(path)

    allowlist = parse_component_types(
        hart / 'integrations' / 'agent_engine' / 'liquid_ui_service.py')
    web_renderers = parse_switch_cases(
        nunba / 'landing-page' / 'src' / 'components'
        / 'AgentOverlay' / 'AgentOverlay.jsx')

    print(f'Sites: {len(sites)} | Distinct emitted types: {len(emitted)}')
    print(f'HARTOS COMPONENT_TYPES: {len(allowlist)} declared')
    print(f'Web AgentOverlay switch: {len(web_renderers)} cases')
    print()

    print('Emitted-but-not-allowlisted (HARTOS would reject):')
    bad_emit = sorted(set(emitted) - allowlist)
    for ty in bad_emit:
        print(f'  - {ty}  ({len(emitted[ty])} site(s))')
    print()

    print('Emitted-but-no-web-renderer (falls to default {} box):')
    bad_render = sorted(set(emitted) - web_renderers)
    for ty in bad_render:
        n = len(emitted[ty])
        ok = '(allowed)' if ty in allowlist else '(REJECTED by allowlist)'
        print(f'  - {ty}  {n} site(s) {ok}')
    print()

    print('Web renderers without any HARTOS emit (dead code candidates):')
    dead = sorted(web_renderers - set(emitted))
    for ty in dead:
        print(f'  - {ty}')
    print()

    print('Allowlist types without any emit (declared but unused):')
    unused = sorted(allowlist - set(emitted))
    for ty in unused:
        print(f'  - {ty}')

    return 0 if not bad_emit else 1


if __name__ == '__main__':
    sys.exit(main())
