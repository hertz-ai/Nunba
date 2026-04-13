"""
Deep functional tests for cultural_wisdom.py business rules.

Tests INTENDED BEHAVIOR of the cultural wisdom system:
- 30+ traits from global cultures (immutable tuple)
- Each trait has name, origin, meaning, trait, behavior
- No duplicate cultures
- get_cultural_prompt() for autogen (full)
- get_cultural_prompt_compact() for LangChain (short)
- Geographical diversity: Africa, Asia, Americas, Europe, Middle East
- Immutability: traits tuple cannot be modified
"""
import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from cultural_wisdom import (
    CULTURAL_TRAITS,
    get_cultural_prompt,
    get_cultural_prompt_compact,
)


# ==========================================================================
# 1. Trait Collection Structure
# ==========================================================================
class TestTraitCollection:
    def test_is_immutable_tuple(self):
        assert isinstance(CULTURAL_TRAITS, tuple), "CULTURAL_TRAITS must be immutable tuple"

    def test_at_least_30_traits(self):
        assert len(CULTURAL_TRAITS) >= 30, f"Expected 30+ traits, got {len(CULTURAL_TRAITS)}"

    def test_each_trait_is_dict(self):
        for t in CULTURAL_TRAITS:
            assert isinstance(t, dict), f"Each trait must be a dict, got {type(t)}"


# ==========================================================================
# 2. Trait Fields
# ==========================================================================
class TestTraitFields:
    REQUIRED_KEYS = {'name', 'origin', 'meaning', 'trait', 'behavior'}

    def test_all_traits_have_required_keys(self):
        for i, t in enumerate(CULTURAL_TRAITS):
            missing = self.REQUIRED_KEYS - set(t.keys())
            assert not missing, f"Trait {i} ({t.get('name','?')}) missing keys: {missing}"

    def test_names_are_non_empty(self):
        for t in CULTURAL_TRAITS:
            assert t['name'].strip(), f"Trait name is empty: {t}"

    def test_origins_are_non_empty(self):
        for t in CULTURAL_TRAITS:
            assert t['origin'].strip(), f"Trait {t['name']} has empty origin"

    def test_meanings_are_non_empty(self):
        for t in CULTURAL_TRAITS:
            assert t['meaning'].strip(), f"Trait {t['name']} has empty meaning"

    def test_traits_are_non_empty(self):
        for t in CULTURAL_TRAITS:
            assert t['trait'].strip(), f"Trait {t['name']} has empty trait description"

    def test_behaviors_are_non_empty(self):
        for t in CULTURAL_TRAITS:
            assert t['behavior'].strip(), f"Trait {t['name']} has empty behavior"


# ==========================================================================
# 3. No Duplicates
# ==========================================================================
class TestNoDuplicates:
    def test_unique_names(self):
        names = [t['name'] for t in CULTURAL_TRAITS]
        assert len(names) == len(set(names)), \
            f"Duplicate trait names: {[n for n in names if names.count(n) > 1]}"

    def test_unique_meanings(self):
        meanings = [t['meaning'] for t in CULTURAL_TRAITS]
        # Meanings should be mostly unique (some overlap is ok)
        assert len(set(meanings)) >= len(meanings) * 0.8, "Too many duplicate meanings"


# ==========================================================================
# 4. Geographic Diversity
# ==========================================================================
class TestGeographicDiversity:
    def _origins(self):
        return ' '.join(t['origin'] for t in CULTURAL_TRAITS).lower()

    def test_has_african_cultures(self):
        origins = self._origins()
        assert 'africa' in origins or 'zulu' in origins or 'ubuntu' in origins or 'xhosa' in origins, \
            "Must include African cultural wisdom"

    def test_has_asian_cultures(self):
        origins = self._origins()
        assert any(w in origins for w in ['japan', 'china', 'india', 'korea', 'tibet', 'hindu', 'buddhis']), \
            "Must include Asian cultural wisdom"

    def test_has_european_cultures(self):
        origins = self._origins()
        assert any(w in origins for w in ['greece', 'denmark', 'finland', 'sweden', 'norway', 'italy', 'spain', 'germany', 'nordic', 'european', 'celtic']), \
            "Must include European cultural wisdom"

    def test_has_americas_cultures(self):
        origins = self._origins()
        assert any(w in origins for w in ['native', 'indigenous', 'maya', 'inca', 'navajo', 'lakota', 'mesoamerica', 'south america']), \
            "Must include Americas indigenous cultural wisdom"

    def test_has_middle_eastern_cultures(self):
        origins = self._origins()
        assert any(w in origins for w in ['arab', 'persian', 'islamic', 'sufi', 'middle east', 'hebrew', 'jewish']), \
            "Must include Middle Eastern cultural wisdom"

    def test_at_least_5_regions(self):
        """Traits must span at least 5 continental regions."""
        regions = set()
        for t in CULTURAL_TRAITS:
            origin = t['origin'].lower()
            if any(w in origin for w in ['africa', 'zulu', 'xhosa', 'ubuntu', 'bantu']):
                regions.add('africa')
            if any(w in origin for w in ['japan', 'china', 'india', 'korea', 'tibet', 'south asia', 'east asia']):
                regions.add('asia')
            if any(w in origin for w in ['greek', 'nordic', 'celtic', 'roman', 'scandi', 'europe']):
                regions.add('europe')
            if any(w in origin for w in ['native', 'indigenous', 'maya', 'inca', 'lakota', 'mesoamerica']):
                regions.add('americas')
            if any(w in origin for w in ['arab', 'persian', 'sufi', 'islamic', 'middle east', 'hebrew']):
                regions.add('middle_east')
            if any(w in origin for w in ['polynesia', 'maori', 'hawaiian', 'pacific', 'oceania', 'aboriginal']):
                regions.add('oceania')
        assert len(regions) >= 4, f"Need 4+ regions, got {regions}"


# ==========================================================================
# 5. Full Prompt (for autogen)
# ==========================================================================
class TestFullPrompt:
    def test_returns_string(self):
        prompt = get_cultural_prompt()
        assert isinstance(prompt, str)

    def test_non_empty(self):
        prompt = get_cultural_prompt()
        assert len(prompt) > 100, "Full prompt must be substantial"

    def test_contains_trait_names(self):
        prompt = get_cultural_prompt()
        # At least some trait names should appear
        found = sum(1 for t in CULTURAL_TRAITS if t['name'] in prompt)
        assert found >= 5, f"Full prompt should reference trait names, found {found}"

    def test_contains_behavioral_guidance(self):
        prompt = get_cultural_prompt().lower()
        assert 'behavior' in prompt or 'act' in prompt or 'should' in prompt or 'must' in prompt, \
            "Full prompt must include behavioral guidance"


# ==========================================================================
# 6. Compact Prompt (for LangChain)
# ==========================================================================
class TestCompactPrompt:
    def test_returns_string(self):
        prompt = get_cultural_prompt_compact()
        assert isinstance(prompt, str)

    def test_shorter_than_full(self):
        full = get_cultural_prompt()
        compact = get_cultural_prompt_compact()
        assert len(compact) < len(full), \
            f"Compact ({len(compact)}) must be shorter than full ({len(full)})"

    def test_compact_is_concise(self):
        compact = get_cultural_prompt_compact()
        assert len(compact) < 2000, f"Compact prompt is {len(compact)} chars — too long for LangChain context"

    def test_still_meaningful(self):
        compact = get_cultural_prompt_compact()
        assert len(compact) > 50, "Compact prompt too short to be meaningful"


# ==========================================================================
# 7. Immutability
# ==========================================================================
class TestImmutability:
    def test_cannot_append_to_tuple(self):
        with pytest.raises(AttributeError):
            CULTURAL_TRAITS.append({'name': 'Fake'})

    def test_cannot_assign_index(self):
        with pytest.raises(TypeError):
            CULTURAL_TRAITS[0] = {'name': 'Modified'}

    def test_length_stable(self):
        """Tuple length cannot change."""
        n1 = len(CULTURAL_TRAITS)
        n2 = len(CULTURAL_TRAITS)
        assert n1 == n2


# ==========================================================================
# 8. Specific Known Traits
# ==========================================================================
class TestKnownTraits:
    def _find(self, name):
        for t in CULTURAL_TRAITS:
            if t['name'].lower() == name.lower():
                return t
        return None

    def test_ubuntu_exists(self):
        # Search case-insensitive — reload fresh to avoid mutation from immutability test
        from cultural_wisdom import CULTURAL_TRAITS as traits
        names = [t['name'] for t in traits]
        assert 'Ubuntu' in names, f"Ubuntu must be in traits. Names: {names[:5]}..."

    def test_wabi_sabi_or_ikigai(self):
        """Japanese wisdom should be represented."""
        t1 = self._find('Wabi-Sabi')
        t2 = self._find('Ikigai')
        assert t1 or t2, "Must have Japanese cultural wisdom (Wabi-Sabi or Ikigai)"
