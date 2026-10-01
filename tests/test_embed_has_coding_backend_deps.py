"""python-embed must carry the imports of HARTOS's in-process coding backend.

Measured 2026-10-01 on the installed build: `python-embed python.exe` raised
ModuleNotFoundError for grep_ast and diff_match_patch, so
AiderNativeBackend.is_installed() was False, no coding backend was available
and every daemon coding goal answered "No coding tools installed".  The
packages were pinned in HARTOS requirements.txt but not in EMBED_DEPS, which is
what fills python-embed.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), 'scripts'))

import deps  # noqa: E402

# import name -> distribution name in EMBED_DEPS
_REQUIRED = {
    'grep_ast': 'grep-ast',            # repomap.py: from grep_ast import ...
    'tree_sitter': 'tree-sitter',      # repomap.py: from tree_sitter import Query
    'tree_sitter_language_pack': 'tree-sitter-language-pack',  # grep_ast.tsl
    'diff_match_patch': 'diff-match-patch',  # coders/search_replace.py
    'pathspec': 'pathspec',            # grep_ast
    # tree_sitter_language_pack/__init__.py imports these at load
    'tree_sitter_c_sharp': 'tree-sitter-c-sharp',
    'tree_sitter_embedded_template': 'tree-sitter-embedded-template',
    'tree_sitter_yaml': 'tree-sitter-yaml',
}


def test_embed_deps_carry_every_aider_core_import():
    missing = [dist for dist in _REQUIRED.values()
               if dist not in deps.EMBED_DEPS]
    assert not missing, f'EMBED_DEPS lacks {missing}'


def test_grep_ast_pin_has_the_tsl_module_repomap_imports():
    # repomap.py imports grep_ast.tsl, which 0.3.3 does not ship (it imports
    # tree_sitter_languages instead); 0.9.0 is the first line that has it.
    major_minor = tuple(int(p) for p in
                        deps.EMBED_DEPS['grep-ast'].split('.')[:2])
    assert major_minor >= (0, 5)
