"""Guard: llama-server spawns with ONE slot by default.

`llama/llama_config.py::_do_start_server` resolves the slot count as
env HEVOLVE_LLAMA_PARALLEL -> config 'llama_parallel' -> code default.
The default was 2 until 2026-09-03; measured on the installed build that
day (22:27:08), --parallel 2 --kv-unified let a background autogen.create
call carrying 70 tool schemas run concurrently with a reuse turn and
llama failed BOTH with "Context size has been exceeded", and the wire
trimmer's per-slot budget (12288/2 - 2048 - 2816 = 1280 tokens) truncated
the reuse system prompt on every call.  The default is now 1.

The spawner is a 400-line method that needs a model file, a port and a
GPU probe, so this guards the SOURCE: both fallbacks must be 1, and the
chosen value must still be exported as HEVOLVE_LLAMA_SLOTS so the HARTOS
wire trimmer (core.llm_outbound_logger._get_budget_per_slot) keeps
reading the same number the server was launched with (one source).
RED with the old `or 2` / `n_parallel = 2` literals.
"""
import os
import re
import unittest

_SRC = os.path.join(os.path.dirname(__file__), '..', 'llama', 'llama_config.py')


def _parallel_block() -> str:
    with open(_SRC, encoding='utf-8') as fh:
        src = fh.read()
    start = src.index("os.environ.get('HEVOLVE_LLAMA_PARALLEL'")
    end = src.index('n_parallel = max(1, min(n_parallel, 4))', start)
    return src[start:end]


class LlamaParallelDefault(unittest.TestCase):
    def test_env_and_config_fallback_default_is_one(self):
        block = _parallel_block()
        # `... or self.config.get('llama_parallel') or 1)`
        self.assertRegex(block, r"self\.config\.get\('llama_parallel'\)\s+or\s+1\)")
        self.assertNotRegex(block, r"or\s+2\)")

    def test_parse_error_fallback_is_one(self):
        block = _parallel_block()
        self.assertRegex(block, r"except \(TypeError, ValueError\):\s*\n\s*n_parallel = 1\b")
        self.assertNotRegex(block, r"n_parallel = 2\b")

    def test_slot_count_is_exported_for_the_wire_trimmer(self):
        with open(_SRC, encoding='utf-8') as fh:
            src = fh.read()
        self.assertIn("os.environ['HEVOLVE_LLAMA_SLOTS'] = str(n_parallel)", src)
        self.assertTrue(re.search(r'"--parallel",\s*str\(n_parallel\)', src))


if __name__ == '__main__':
    unittest.main()
