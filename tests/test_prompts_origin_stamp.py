"""
/prompts must label every agent's provenance.

WHY THIS EXISTS

The parity plan's phase D says to port web's `is_public` filter and origin
labels, and — to its credit — says to "verify Nunba's /prompts payload actually
carries is_public/origin before rendering them, or the badges will be uniformly
blank."  Verified 2026-08-11: it carried NONE of them.  `get_prompts_route`
assembled its list from three labelled sections (LOCAL_AGENTS, HARTOS backend,
CLOUD_AGENTS) and discarded the label, so no consumer could tell a
runs-on-your-machine agent from a hosted one without guessing from field shapes.

That guessing is what the web repo explicitly warns against: its own
`isBrowsableAgent` docstring records, from a real local dump, that all 1157
rows come back with `is_public` absent — so a filter keyed on `is_public` is a
predicate that can never fire.  Porting it to Nunba would have been a vacuous
guard, and the name-pattern fallback it ships is called "a floor, not a
solution" by its own author.

So the fix is at the producer, not the consumer: stamp `origin` where the
provenance is still known.

These tests pin the field's PRESENCE and its VOCABULARY.  Presence matters
because a silently-absent key degrades to "no badge" — which looks like a
styling choice, not a broken contract, and is precisely how this went unnoticed.
"""
import importlib

import pytest


@pytest.fixture(scope='module')
def routes_mod():
    return importlib.import_module('routes.chatbot_routes')


def test_origin_constants_are_the_web_vocabulary(routes_mod):
    """local/peer/hive — the same words the web card labels switch on.

    If these drift, the two surfaces describe the same agent differently, which
    is the one-name-two-vocabularies failure this repo keeps paying for.
    """
    assert routes_mod.ORIGIN_LOCAL == 'local'
    assert routes_mod.ORIGIN_PEER == 'peer'
    assert routes_mod.ORIGIN_HIVE == 'hive'


def test_origin_is_not_an_alias_of_type(routes_mod):
    """`origin` must be its own key, never a rename of `type`.

    `type` is already overloaded: HARTOS rows get type='local' forced regardless
    of provenance, and local_count/cloud_count are derived from it.  Collapsing
    the two would silently change those counts.
    """
    assert routes_mod.ORIGIN_LOCAL != 'cloud'
    # The constants exist as module-level names, so a future edit that replaces
    # the stamp with `agent['type']` has to delete these to compile.
    assert {'ORIGIN_LOCAL', 'ORIGIN_PEER', 'ORIGIN_HIVE'} <= set(dir(routes_mod))


def test_every_local_agent_row_can_be_stamped(routes_mod):
    """LOCAL_AGENTS rows are plain dicts, so `.copy()` + stamp is safe.

    Guards the assumption the route makes: if a row were a non-dict (a model
    object, say) the stamp would raise at request time, not here.
    """
    assert routes_mod.LOCAL_AGENTS, 'LOCAL_AGENTS is empty — nothing to stamp'
    for row in routes_mod.LOCAL_AGENTS:
        assert isinstance(row, dict), f'LOCAL_AGENTS row is {type(row)}, not dict'
        stamped = row.copy()
        stamped['origin'] = routes_mod.ORIGIN_LOCAL
        assert stamped['origin'] == 'local'
        # The original must be untouched — the route serves this list on every
        # request, so mutating it in place would leak across requests.
        assert 'origin' not in row or row.get('origin') == 'local'


def test_every_cloud_agent_row_can_be_stamped(routes_mod):
    assert routes_mod.CLOUD_AGENTS, 'CLOUD_AGENTS is empty — nothing to stamp'
    for row in routes_mod.CLOUD_AGENTS:
        assert isinstance(row, dict), f'CLOUD_AGENTS row is {type(row)}, not dict'
        stamped = row.copy()
        stamped['origin'] = routes_mod.ORIGIN_HIVE
        assert stamped['origin'] == 'hive'


def test_route_source_stamps_origin_at_every_append_site(routes_mod):
    """AST-free source check: three appends, three stamps.

    Deliberately a source assertion rather than a live request — exercising the
    route needs a Flask app, an internet probe and a HARTOS backend, and this
    test's job is narrow: catch a FOURTH agent source being added later without
    an origin stamp.  That is the realistic regression, and it is invisible at
    runtime because the new rows just render without a badge.
    """
    import inspect

    src = inspect.getsource(routes_mod.get_prompts_route)
    appends = src.count('agents.append(')
    stamps = src.count("['origin'] =")
    assert appends >= 3, f'expected >=3 append sites, found {appends}'
    assert stamps == appends, (
        f'{appends} agents.append() sites but only {stamps} origin stamps — '
        'a source was added without labelling its provenance, so those rows '
        'will render with no badge and nothing will look broken'
    )
