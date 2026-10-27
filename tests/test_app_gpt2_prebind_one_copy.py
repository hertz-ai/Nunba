"""app.py's GPT2 pre-bind goes through HARTOS's one implementation.

Three copies of one workaround (bind transformers.GPT2TokenizerFast before
langchain_core's lazy lookup can recurse) drifted: the copy that ran first
had no transformers-5 branch.  HARTOS #142 made
core._transformers_lazy_guard.bind_gpt2_tokenizer_fast the one
implementation and pointed hart_intelligence_entry at it.  app.py's macOS
frozen-boot copy was the third; it now calls the same function.

Static check (the block only runs in a frozen macOS build): app.py must not
import the fast-tokenizer module itself, and must call the HARTOS function.
"""

import ast
import os

APP_PY = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app.py')

with open(APP_PY, encoding='utf-8') as _f:
    TREE = ast.parse(_f.read(), APP_PY)


def _imports_from(module):
    return [n for n in ast.walk(TREE)
            if isinstance(n, ast.ImportFrom) and n.module == module]


def test_app_has_no_inline_gpt2_prebind():
    inline = _imports_from('transformers.models.gpt2.tokenization_gpt2_fast')
    assert inline == [], (
        "app.py imports the fast GPT2 tokenizer itself at line(s) %s; call "
        "core._transformers_lazy_guard.bind_gpt2_tokenizer_fast instead"
        % [n.lineno for n in inline])


def test_app_calls_the_hartos_prebind():
    imported = [n for n in _imports_from('core._transformers_lazy_guard')
                if any(a.name == 'bind_gpt2_tokenizer_fast' for a in n.names)]
    assert imported, "app.py must import bind_gpt2_tokenizer_fast from HARTOS"
    calls = [n for n in ast.walk(TREE)
             if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
             and n.func.id == 'bind_gpt2_tokenizer_fast']
    assert calls, "app.py imports bind_gpt2_tokenizer_fast but never calls it"
