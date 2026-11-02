"""The python-embed copy must drop only payload the bundle CANNOT load.

Measured on the 2026-08-19 install, inside
python-embed/Lib/site-packages/hevolveai:

    *.stale        5.6 MB / 14 files    leftover build artifacts
    cp310 .pyd    24.7 MB / 147 files   the bundle runs python312.dll
    cp312 .pyd    21.9 MB / 142 files   the live set

30.3 MB of a 54 MB package was unloadable — 56% of it — and it shipped in every
installer.  (The tracked note called this "59 MB of hevolveai runtime logs"; it
is not logs, it is compiled extension modules for the wrong ABI plus leftovers.)

Dropping them is safe by CPython's own import rules rather than by assumption:
for module ``foo``, 3.12 only ever considers ``foo.cp312-win_amd64.pyd`` and
``foo.pyd``.  A cp310-tagged filename matches neither, and nothing imports a
``.pyd.stale``.

The ABI is READ FROM THE SHIPPING INTERPRETER (its own pythonXY.dll), never from
the building process and never hardcoded: the build host's Python is not
necessarily the one that ships, and a hardcoded 'cp312' would silently begin
deleting the LIVE set the day python-embed is upgraded.  These tests pin that.
"""
import os
import tempfile
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SETUP = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')


def _load_abi_helper():
    """Pull the helper out of the build script without executing the build."""
    with open(_SETUP, encoding='utf-8') as fh:
        src = fh.read()
    start = src.index('def _abi_tag_of_embedded_python')
    end = src.index('# ── Post-build: copy python-embed', start)
    ns = {'os': os}
    exec(src[start:end], ns)  # noqa: S102 - fixture, not user input
    return ns['_abi_tag_of_embedded_python']


def _ignore(names, abi):
    """The predicate as it appears in setup_freeze_nunba._ignore_unloadable."""
    drop = set()
    for n in names:
        if n.endswith('.stale'):
            drop.add(n)
        elif abi and n.endswith('.pyd') and '.cp' in n:
            tag = n.rsplit('.cp', 1)[1].split('-', 1)[0]
            if f'cp{tag}' != abi:
                drop.add(n)
    return drop


class TestAbiIsDerivedNotDeclared(unittest.TestCase):

    def setUp(self):
        self.abi_of = _load_abi_helper()

    def test_reads_the_tag_from_the_dll(self):
        for dll, want in (('python312.dll', 'cp312'),
                          ('python310.dll', 'cp310'),
                          ('python3123.dll', 'cp3123')):
            with tempfile.TemporaryDirectory() as d:
                open(os.path.join(d, dll), 'w').close()
                self.assertEqual(self.abi_of(d), want)

    def test_python3_dll_is_not_mistaken_for_a_version(self):
        """python3.dll is the stable-ABI forwarder and carries no version."""
        with tempfile.TemporaryDirectory() as d:
            open(os.path.join(d, 'python3.dll'), 'w').close()
            self.assertIsNone(self.abi_of(d))

    def test_unknown_abi_returns_none_so_callers_prune_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            open(os.path.join(d, 'readme.txt'), 'w').close()
            self.assertIsNone(self.abi_of(d))
        self.assertIsNone(self.abi_of('/no/such/dir'))

    def test_prune_logic_never_hardcodes_an_abi(self):
        """A literal ABI in the PRUNE path deletes the live set on upgrade.

        Scoped to the prune region on purpose.  Elsewhere in this build script
        'cp312' is legitimate and pre-existing (:2000 filters a pre-built Rust
        wheel by name), so a whole-file scan would fail on unrelated code — and
        "make the test pass" would then mean editing something that is correct.
        """
        with open(_SETUP, encoding='utf-8') as fh:
            src = fh.read()
        start = src.index('def _ignore_unloadable')
        end = src.index('shutil.copytree(_src_embed', start)
        body = '\n'.join(
            ln for ln in src[start:end].splitlines()
            if not ln.lstrip().startswith('#'))
        for bad in ("'cp312'", '"cp312"', "'cp310'", '"cp310"'):
            self.assertNotIn(
                bad, body,
                f'{bad} is hardcoded inside _ignore_unloadable; the ABI must '
                f'come from _abi_tag_of_embedded_python()')

    def test_prune_consults_the_derived_tag(self):
        """The predicate must compare against the derived variable, not a literal."""
        with open(_SETUP, encoding='utf-8') as fh:
            src = fh.read()
        self.assertIn('_embed_abi = _abi_tag_of_embedded_python(_src_embed)', src)
        start = src.index('def _ignore_unloadable')
        end = src.index('shutil.copytree(_src_embed', start)
        self.assertIn('_embed_abi', src[start:end])


class TestOnlyUnloadablePayloadIsDropped(unittest.TestCase):

    ABI = 'cp312'

    def test_drops_wrong_abi_and_stale(self):
        drop = _ignore([
            'reality_grounded_learner.cp310-win_amd64.pyd',
            'hive_mind.cp310-win_amd64.pyd.stale',
            'agent.cp312-win_amd64.pyd.stale',
        ], self.ABI)
        self.assertEqual(len(drop), 3)

    def test_keeps_the_matching_abi(self):
        for name in ('reality_grounded_learner.cp312-win_amd64.pyd',
                     'api_server.cp312-win_amd64.pyd'):
            self.assertEqual(_ignore([name], self.ABI), set())

    def test_keeps_untagged_pyd(self):
        """`foo.pyd` IS a valid 3.12 extension suffix — never drop it."""
        self.assertEqual(_ignore(['plain_module.pyd'], self.ABI), set())

    def test_keeps_ordinary_files(self):
        names = ['__init__.py', 'config.json', 'model.bin', 'README.md']
        self.assertEqual(_ignore(names, self.ABI), set())

    def test_unknown_abi_drops_only_stale(self):
        """With the ABI undetermined we must not guess at extension modules."""
        drop = _ignore([
            'a.cp310-win_amd64.pyd',      # kept: we cannot prove it is dead
            'b.cp310-win_amd64.pyd.stale',  # dropped: nothing imports .stale
        ], None)
        self.assertEqual(drop, {'b.cp310-win_amd64.pyd.stale'})



class TestOrphanModulesAreReportedNotHidden(unittest.TestCase):
    """A wrong-ABI drop is only harmless when the SAME module ships for the
    shipping ABI.  When it does not, that module is ALREADY dead in the
    installed app, and pruning silently would hide it.

    Measured 2026-08-19 on the real install: 141 hevolveai modules shipped both
    cp310+cp312, but SIX shipped cp310 ONLY with no .py and no bare .pyd —
    free_energy, semantic_causal_recall, latent_dynamics, qwen_vl_wrapper,
    shard_executor, state_integrity.  Those Cython modules were never rebuilt
    for 3.12.  The build must say so.
    """

    ABI = 'cp312'

    def _run(self, names):
        orphans = []
        for n in list(names):
            if n.endswith('.pyd') and '.cp' in n and not n.endswith('.stale'):
                tag = n.rsplit('.cp', 1)[1].split('-', 1)[0]
                if f'cp{tag}' != self.ABI:
                    base = n.split('.cp')[0]
                    same = any(o.startswith(f'{base}.{self.ABI}') for o in names)
                    if not (same or f'{base}.py' in names
                            or f'{base}.pyd' in names):
                        orphans.append(base)
        return orphans

    def test_paired_module_is_not_an_orphan(self):
        self.assertEqual(self._run([
            'latent_dynamics.cp310-win_amd64.pyd',
            'latent_dynamics.cp312-win_amd64.pyd',
        ]), [])

    def test_py_fallback_is_not_an_orphan(self):
        self.assertEqual(self._run([
            'free_energy.cp310-win_amd64.pyd', 'free_energy.py',
        ]), [])

    def test_bare_pyd_fallback_is_not_an_orphan(self):
        self.assertEqual(self._run([
            'shard_executor.cp310-win_amd64.pyd', 'shard_executor.pyd',
        ]), [])

    def test_cp310_only_with_no_fallback_IS_an_orphan(self):
        self.assertEqual(self._run([
            'state_integrity.cp310-win_amd64.pyd',
        ]), ['state_integrity'])

    def test_orphan_detection_is_per_module_not_per_directory(self):
        """One dead module must not mask a healthy sibling, or vice versa."""
        got = self._run([
            'qwen_vl_wrapper.cp310-win_amd64.pyd',          # orphan
            'hive_mind.cp310-win_amd64.pyd',                # paired
            'hive_mind.cp312-win_amd64.pyd',
        ])
        self.assertEqual(got, ['qwen_vl_wrapper'])

if __name__ == '__main__':
    unittest.main()
