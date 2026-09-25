"""A model switch that changed nothing must not report success.

On the desktop, POST /api/llm/switch builds a FRESH LlamaConfig per
request (main.py:2163).  Its ``server_process`` is therefore None, so
``switch_model``'s ``stop_server()`` silently does nothing and the
incumbent is still running when ``start_server()`` is called.
``_do_start_server`` then scans [desired, 8080, 8081], finds that
incumbent, ADOPTS it and returns True -- and its catalog-sync block
rewrites ``selected_model_index`` back to whatever is really loaded.

The endpoint answered {"success": true, "model_name": <the NEW model>},
main.py booked the NEW model's VRAM with the orchestrator, and the server
went on serving the OLD model.

Confirmed live on the reference box 2026-09-22 (read-only): :8080 answers
{"status":"ok"}, which check_server_type maps to EXTERNAL_LLAMA, so the
adopt branch is the one that runs.

The fix does NOT change the adopt branch.  Adopting whatever main LLM is
already up is correct for the boot and warm-up callers -- it is what
keeps a second server off :8080, the 2026-09-13 incident that made every
agent call return HTTP 400 -- and those callers pass no preset.  Only a
caller that NAMED a model can be disappointed, so the check belongs in
switch_model, on the outcome.

    python -m pytest tests/test_switch_model_reports_the_truth.py -q
"""
import os
import sys

import pytest

_NUNBA = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
for _p in (_NUNBA, os.path.join(os.path.dirname(_NUNBA), 'HARTOS')):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from llama.llama_config import MODEL_PRESETS, LlamaConfig


@pytest.fixture
def cfg():
    """A LlamaConfig with only what switch_model touches.

    Built with __new__ so no config file is read or WRITTEN -- a Nunba
    test that wrote the real ~/.nunba/llama_config.json is already an open
    finding (#81), and this suite does not add a second one.
    """
    c = LlamaConfig.__new__(LlamaConfig)
    c.config = {'selected_model_index': 0, 'server_port': 8080}
    c.server_process = None
    c.saved = []
    c._save_config = lambda: c.saved.append(dict(c.config))
    c.stop_server = lambda: None

    class _Installer:
        def get_model_path(self, preset):
            return 'F:/models/' + preset.file_name

    c.installer = _Installer()
    return c


def arm(c, *, started, serving):
    c.start_server = lambda model_preset=None, force_new_port=False: started
    c.serving_model_file = lambda port=None: serving


TARGET = 1 if len(MODEL_PRESETS) > 1 else 0


class TestAnAdoptedIncumbentIsNotASwitch:
    def test_a_different_model_still_serving_is_reported_as_failure(self, cfg):
        """The regression.  start_server returned True because it adopted
        the running server; the requested model never loaded."""
        arm(cfg, started=True, serving='SomeOtherModel-Q4_K_M.gguf')
        assert cfg.switch_model(TARGET) is False

    def test_the_requested_model_actually_serving_is_a_success(self, cfg):
        preset = MODEL_PRESETS[TARGET]
        arm(cfg, started=True, serving=os.path.basename(preset.file_name))
        assert cfg.switch_model(TARGET) is True


class TestItDoesNotInventFailures:
    def test_an_unreachable_server_does_not_turn_a_start_into_a_failure(
            self, cfg):
        """None means "could not tell", not "a different model".  Reporting
        failure here would break the case where the switch worked but the
        server has not finished answering /v1/models yet."""
        arm(cfg, started=True, serving=None)
        assert cfg.switch_model(TARGET) is True

    def test_a_start_that_failed_is_still_a_failure(self, cfg):
        arm(cfg, started=False, serving=None)
        assert cfg.switch_model(TARGET) is False

    def test_an_out_of_range_index_is_refused_before_anything_happens(self,
                                                                     cfg):
        arm(cfg, started=True, serving=None)
        assert cfg.switch_model(len(MODEL_PRESETS) + 5) is False
        assert cfg.saved == [], 'wrote config for a model that does not exist'


class TestServingModelFileReadsTheServerNotTheConfig:
    """The config records what was REQUESTED; these two drift apart the
    moment an adopt happens, which is the case being detected."""

    def _cfg_with_response(self, payload, status=200):
        import llama.llama_config as lc

        c = LlamaConfig.__new__(LlamaConfig)
        c.config = {'server_port': 8080}

        class _Resp:
            status_code = status

            def json(self):
                return payload

        lc.requests = type('R', (), {'get': staticmethod(
            lambda *a, **k: _Resp())})()
        lc._find_live_llama_port = lambda force=False: 8080
        return c

    def test_it_reads_the_openai_shape(self):
        c = self._cfg_with_response(
            {'data': [{'id': 'C:\\\\models\\\\Qwen3.5-4B-UD-Q4_K_XL.gguf'}]})
        assert c.serving_model_file() == 'Qwen3.5-4B-UD-Q4_K_XL.gguf'

    def test_it_reads_the_llama_server_shape(self):
        c = self._cfg_with_response(
            {'models': [{'name': '/opt/models/Tiel-35B-Q4_K_XL.gguf'}]})
        assert c.serving_model_file() == 'Tiel-35B-Q4_K_XL.gguf'

    def test_a_non_200_is_unknown_not_a_mismatch(self):
        c = self._cfg_with_response({}, status=503)
        assert c.serving_model_file() is None

    def test_an_empty_body_is_unknown(self):
        c = self._cfg_with_response({'data': []})
        assert c.serving_model_file() is None
