"""An MTP spawn must not carry --embeddings.

Measured 2026-09-24 on the owner's desktop (llama.cpp b9180+, Tiel-Coder
35B-A3B MTP): the spawn Nunba built asserted at load,
  llama-graph.cpp:3563: GGML_ASSERT(inp != nullptr &&
      "missing result_norm/result_embd tensor") failed
and the identical command with only --embeddings removed loaded and served.
The watchdog then respawned the preset from config and it crashed again,
so choosing the MTP preset left the desktop with no LLM at all.

hevolveai's native-embedding client already treats a server without
--embeddings as "no native route" (_probe_native_embedding -> None), so
MTP wins and the embeddings route steps aside, with a warning.
"""
import ast
import logging
import os

import llama.llama_config as lc

MTP = ['--spec-type', 'draft-mtp', '--spec-draft-n-max', '3']


class TestEmbeddingsArgs:

    def test_no_mtp_keeps_the_embeddings_route(self):
        assert lc.embeddings_args([]) == ['--embeddings']

    def test_mtp_drops_the_embeddings_route(self):
        assert lc.embeddings_args(MTP) == []

    def test_other_spec_types_keep_the_route(self):
        # Only draft-mtp was measured to conflict; n-gram speculation keeps it.
        ngram = ['--spec-type', 'ngram-map-k', '--spec-ngram-size-n', '3']
        assert lc.embeddings_args(ngram) == ['--embeddings']

    def test_the_drop_is_logged(self, caplog):
        with caplog.at_level(logging.WARNING, logger='NunbaLlamaConfig'):
            lc.embeddings_args(MTP)
        assert any('--embeddings' in r.getMessage() for r in caplog.records)


def test_source_guard_embeddings_flag_has_one_writer():
    """The spawn must ask embeddings_args, not spell --embeddings itself:
    a second literal is how the MTP conflict would come back."""
    path = os.path.join(os.path.dirname(lc.__file__), 'llama_config.py')
    tree = ast.parse(open(path, encoding='utf-8').read())
    owners = []
    for fn in ast.walk(tree):
        if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for node in ast.walk(fn):
                if isinstance(node, ast.Constant) and node.value == '--embeddings':
                    owners.append(fn.name)
    # Nested functions are walked twice (outer + inner); count distinct innermost.
    assert set(owners) == {'embeddings_args'}, owners
