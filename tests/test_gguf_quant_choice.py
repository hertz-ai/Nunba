"""The Model Management page picks a quant that fits and is worth having.

Two defects, both proven by running the real picker against a real Hub
manifest:

1. It CRASHED. `_gguf_install_files` imports
   llama_gguf_compute_requirements unconditionally, before any fit check,
   and that function was defined nowhere -- `git log -S` finds no
   definition in either repo's history. The caller catches only
   ValueError, so the ImportError propagated and every GGUF install
   through the page raised before choosing anything.

2. It PREFERRED THE WORST QUANT. The preference ladder listed only older
   spellings (q8_0, q6_k, q5_k_m, q4_k_m, q4_k_s, q3_k_m, q2_k). Against a
   modern repo publishing Q4_K_XL / IQ4_XS / Q8_K_XL, the only marker that
   matched anything was `q2_k`, via Q2_K_XL -- the tier that repo's own
   card calls "THE LAST RESORT ... struggles with agentic coding" -- so a
   24 GB card was handed 2-bit weights.

The picker is loaded by extracting its source rather than importing
main.py, which builds the whole Flask app: the function under test is
pure given its arguments, and this keeps the test to the code that
matters. It is the REAL source, compiled and executed.

    python -m pytest tests/test_gguf_quant_choice.py -q
"""
import ast
import os
import sys

import pytest

_NUNBA = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
for _p in (_NUNBA, os.path.join(os.path.dirname(_NUNBA), 'HARTOS')):
    if _p not in sys.path:
        sys.path.insert(0, _p)

GIB = 1024 ** 3

# The real Cyber-Tiel-Coder-35B-A3B-GGUF-MTP manifest and its published
# sizes, from the model card.
QUANTS = {
    'Q2_K_XL': 12.7, 'IQ3_XXS': 13.6, 'Q3_K_XL': 17.2, 'IQ4_XS': 18.1,
    'Q4_K_S': 21.3, 'Q4_K_XL': 22.7, 'Q5_K_XL': 27.0, 'Q6_K_XL': 32.2,
    'Q8_K_XL': 38.8,
}
_STEM = 'Cyber-Tiel-Coder-35B-A3B-MTP-UD-%s.gguf'
MANIFEST = [_STEM % k for k in QUANTS] + ['mmproj-BF16.gguf', 'README.md']
SIZES = {_STEM % k: int(v * GIB) for k, v in QUANTS.items()}
SIZES['mmproj-BF16.gguf'] = int(1.5 * GIB)


@pytest.fixture(scope='module')
def pick():
    """The real _gguf_install_files, with disk never the binding limit so
    these tests measure the COMPUTE decision. Disk is a separate guard and
    has its own behaviour; letting the CI machine's free space decide which
    quant is chosen would make these assertions depend on the box."""
    src = open(os.path.join(_NUNBA, 'main.py'), encoding='utf-8').read()
    fn = next(n for n in ast.parse(src).body
              if isinstance(n, ast.FunctionDef)
              and n.name == '_gguf_install_files')
    ns = {}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), 'main.py', 'exec'),
         ns)
    real = ns['_gguf_install_files']

    class _Unlimited:
        free = 1 << 60

    import shutil
    orig = shutil.disk_usage
    shutil.disk_usage = lambda _p: _Unlimited()

    def _call(vram, ram, moe=False, requested=''):
        return real(MANIFEST, requested, SIZES,
                    {'gpu_available': vram > 0, 'vram_free_gb': vram,
                     'ram_free_gb': ram}, is_moe=moe)
    yield _call
    shutil.disk_usage = orig


def quant_of(files):
    return files['model'].split('UD-')[-1].replace('.gguf', '')


class TestItRunsAtAll:
    def test_the_picker_does_not_raise(self, pick):
        """Regression for the ImportError. Before the missing function was
        defined this raised for EVERY GGUF repo."""
        assert pick(24, 32, moe=True)['model'] in SIZES

    def test_the_projector_is_carried(self, pick):
        assert pick(24, 32, moe=True).get('mmproj') == 'mmproj-BF16.gguf'


class TestItPrefersQualityThatFits:
    def test_a_big_card_is_not_handed_two_bit_weights(self, pick):
        """The headline defect. Q2_K_XL is the card's declared last
        resort; a 48 GB machine must not receive it."""
        assert quant_of(pick(48, 64, moe=True)) != 'Q2_K_XL'

    def test_a_roomy_machine_gets_the_top_tier(self, pick):
        assert quant_of(pick(48, 64, moe=True)) == 'Q8_K_XL'

    def test_iq_and_xl_quants_are_visible_to_the_ladder(self, pick):
        """IQ4_XS and the UD *_XL quants matched no marker at all before,
        so they could only ever be chosen by falling off the end of the
        preference list."""
        chosen = {quant_of(pick(v, r, moe=True))
                  for v, r in [(48, 64), (24, 32), (8, 32), (4.7, 21.4)]}
        assert chosen & {'Q8_K_XL', 'Q5_K_XL', 'IQ4_XS', 'Q4_K_XL'}
        assert 'Q2_K_XL' not in chosen

    def test_quality_order_is_monotonic_in_available_memory(self, pick):
        """More memory must never yield a worse quant."""
        order = list(QUANTS)                      # ascending size
        budgets = [(4.7, 21.4), (8, 32), (24, 32), (48, 64), (64, 128)]
        idx = [order.index(quant_of(pick(v, r, moe=True)))
               for v, r in budgets]
        assert idx == sorted(idx), idx


class TestCombinedMemoryOnlyForAMixtureOfExperts:
    def test_a_moe_may_spend_ram_and_vram_together(self, pick):
        """4.7 GB VRAM + 21.4 GB RAM is 26.1 combined, which holds the
        18.1 GB IQ4_XS. Judged on VRAM alone nothing fits at all."""
        assert quant_of(pick(4.7, 21.4, moe=True)) == 'IQ4_XS'

    def test_the_same_machine_refuses_every_quant_for_a_dense_model(self,
                                                                     pick):
        """The owner's constraint, at its sharpest. A dense model touches
        every parameter every token, so spilling it to RAM costs a PCIe
        round trip per token and is never offered. On this machine that
        means NOTHING is offered -- even the 12.7 GB last-resort tier wants
        25.4 GB of RAM against 21.4 free -- while the identical manifest
        judged as a MoE yields IQ4_XS. Same files, same box, and the only
        difference is whether the experts may sit in RAM."""
        with pytest.raises(ValueError):
            pick(4.7, 21.4, moe=False)
        assert quant_of(pick(4.7, 21.4, moe=True)) == 'IQ4_XS'

    def test_no_gpu_means_no_combined_budget_even_for_a_moe(self, pick):
        """--cpu-moe keeps attention on the GPU. With no GPU there is
        nothing to split against, so the RAM-only rule stands."""
        assert quant_of(pick(0, 32, moe=True)) == quant_of(pick(0, 32,
                                                                moe=False))

    def test_dense_is_judged_only_on_one_pool_at_a_time(self, pick):
        """Replaces a tautology. The original compared pick(moe=False) to
        pick(moe=False) -- the same call twice -- so it could never fail.

        The real property: a dense model's answer is reproducible from the
        single-pool rule alone. If the combined arm ever leaked into the
        dense path, some budget here would admit a quant that neither pool
        can hold on its own."""
        from models.catalog import llama_gguf_compute_requirements
        for v, r in [(8, 32), (24, 32), (48, 64), (4.7, 21.4)]:
            try:
                chosen = QUANTS[quant_of(pick(v, r, moe=False))]
            except ValueError:
                continue                      # nothing fit; nothing to check
            need_vram, need_ram = llama_gguf_compute_requirements(chosen)
            assert v >= need_vram or r >= need_ram, (
                f'{v}/{r} admitted a {chosen} GB dense quant that needs '
                f'{need_vram} VRAM or {need_ram} RAM -- neither pool holds '
                f'it, so the combined MoE arm leaked into the dense path')


class TestAnOperatorOverrideStillWins:
    def test_an_explicit_quant_is_honoured(self, pick):
        assert quant_of(pick(48, 64, moe=True,
                             requested=_STEM % 'Q4_K_XL')) == 'Q4_K_XL'

    def test_a_file_outside_the_manifest_is_refused(self, pick):
        with pytest.raises(ValueError):
            pick(48, 64, moe=True, requested='../evil.gguf')

    def test_an_explicit_quant_that_cannot_fit_is_refused(self, pick):
        with pytest.raises(ValueError):
            pick(0.0, 1.0, moe=False, requested=_STEM % 'Q8_K_XL')
