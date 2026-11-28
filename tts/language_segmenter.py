"""
Language Segmenter — split mixed-language + multimedia text into segments.

Ported from makeittalk/task_c.py TextSplitter logic, extended with
media tag extraction for ACE Step music and DiffRhythm singing voice.

Segment types:
  - speech:  {'type': 'speech', 'lang': 'ta', 'text': '...'}
  - music:   {'type': 'music',  'text': '...', 'genre': '...', 'duration': 30}
  - sing:    {'type': 'sing',   'text': '...', 'duration': 30}
  - lyrics:  {'type': 'lyrics', 'text': '...'}

Example:
    segment("வணக்கம் <music genre='jazz' duration='10'>chill intro</music> hello")
    → [{'type': 'speech', 'lang': 'ta', 'text': 'வணக்கம்'},
       {'type': 'music',  'text': 'chill intro', 'genre': 'jazz', 'duration': 10},
       {'type': 'speech', 'lang': 'en', 'text': 'hello'}]
"""

import re
import string
import unicodedata

# ── Unicode script ranges ─────────────────────────────────────────
SCRIPT_RANGES = {
    'devanagari': (0x0900, 0x097F),
    'bengali':    (0x0980, 0x09FF),
    'tamil':      (0x0B80, 0x0BFF),
    'gurmukhi':   (0x0A00, 0x0A7F),
    'gujarati':   (0x0A80, 0x0AFF),
    'kannada':    (0x0C80, 0x0CFF),
    'telugu':     (0x0C00, 0x0C7F),
    'malayalam':  (0x0D00, 0x0D7F),
    'odia':       (0x0B00, 0x0B7F),
    'latin':      (0x0000, 0x007F),
    'arabic':     (0x0600, 0x06FF),
    'cjk':        (0x4E00, 0x9FFF),
    'hangul':     (0xAC00, 0xD7AF),
    'katakana':   (0x30A0, 0x30FF),
    'hiragana':   (0x3040, 0x309F),
    # Scripts named only so a requested language can be matched to its
    # letters (LANG_SCRIPTS); none has a SCRIPT_TO_LANG guess, so text with
    # no requested language still falls back to 'en' as before.
    'sinhala':    (0x0D80, 0x0DFF),
    'thai':       (0x0E00, 0x0E7F),
    'lao':        (0x0E80, 0x0EFF),
    'myanmar':    (0x1000, 0x109F),
    'khmer':      (0x1780, 0x17FF),
    'ol_chiki':   (0x1C50, 0x1C7F),
    'meetei':     (0xABC0, 0xABFF),
    'greek':      (0x0370, 0x03FF),
    'cyrillic':   (0x0400, 0x04FF),
    'hebrew':     (0x0590, 0x05FF),
}

# Letters of a script that sit outside its block above. Without the Latin
# ones, 'é', 'ñ', 'ş' or Vietnamese 'ộ' read as an unknown script and cut a
# French, Spanish, Turkish or Vietnamese word in two ("caf é").
_EXTRA_RANGES = (
    ('latin',  0x00C0, 0x024F),   # Latin-1 Supplement, Extended-A and -B
    ('latin',  0x1E00, 0x1EFF),   # Latin Extended Additional (Vietnamese)
    ('cjk',    0x3005, 0x3007),   # 々 〆 〇
    ('cjk',    0x3400, 0x4DBF),   # CJK Extension A
    ('hangul', 0x3130, 0x318F),   # Hangul compatibility jamo (ㅋㅋ)
)

SCRIPT_TO_LANG = {
    'bengali': 'bn', 'tamil': 'ta', 'gurmukhi': 'pa', 'gujarati': 'gu',
    'kannada': 'kn', 'telugu': 'te', 'malayalam': 'ml', 'odia': 'or',
    'latin': 'en', 'arabic': 'ur', 'cjk': 'zh', 'hangul': 'ko',
    'katakana': 'ja', 'hiragana': 'ja',
}

# The scripts each supported language is written in: every language of
# HARTOS tts_router LANG_ENGINE_PREFERENCE. A run of letters in one of these
# scripts keeps the language the caller asked for. The script guess above
# applies only to a run the requested language is not written in, such as
# an English name inside Tamil. Without this, Spanish became 'en', Japanese
# 'zh', Arabic 'ur' and Russian 'en', and the wrong voice read them.
_LATIN = frozenset({'latin'})
_DEVANAGARI = frozenset({'devanagari'})
LANG_SCRIPTS = {
    **{c: _LATIN for c in ('en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'sv',
                           'tr', 'id', 'vi', 'cs', 'hu', 'fi', 'ro', 'cy', 'is',
                           'ms', 'sw', 'lv')},
    **{c: _DEVANAGARI for c in ('hi', 'mr', 'ne', 'sa', 'brx', 'doi', 'kok',
                                'mai')},
    'bn': frozenset({'bengali'}), 'as': frozenset({'bengali'}),
    'mni': frozenset({'bengali', 'meetei'}),
    'pa': frozenset({'gurmukhi'}), 'gu': frozenset({'gujarati'}),
    'ta': frozenset({'tamil'}), 'te': frozenset({'telugu'}),
    'kn': frozenset({'kannada'}), 'ml': frozenset({'malayalam'}),
    'or': frozenset({'odia'}), 'si': frozenset({'sinhala'}),
    'ur': frozenset({'arabic'}), 'ar': frozenset({'arabic'}),
    'fa': frozenset({'arabic'}),
    'sd': frozenset({'arabic', 'devanagari'}),
    'ks': frozenset({'arabic', 'devanagari'}),
    'zh': frozenset({'cjk'}),
    'ja': frozenset({'cjk', 'hiragana', 'katakana'}),
    'ko': frozenset({'hangul', 'cjk'}),
    'ru': frozenset({'cyrillic'}), 'uk': frozenset({'cyrillic'}),
    'bg': frozenset({'cyrillic'}), 'sr': frozenset({'cyrillic', 'latin'}),
    'el': frozenset({'greek'}), 'he': frozenset({'hebrew'}),
    'th': frozenset({'thai'}), 'lo': frozenset({'lao'}),
    'km': frozenset({'khmer'}), 'my': frozenset({'myanmar'}),
    'sat': frozenset({'ol_chiki'}),
}

# Marks a run of letters in the requested language while the text is cut
# into runs (never a real script name).
_REQUESTED = '<requested>'

_MARATHI_PATTERNS = [r'आहे', r'माझ', r'तुम्ह', r'मी', r'आम्ह', r'पण', r'मध्ये']
_HINDI_PATTERNS = [r'है', r'मैं', r'हम', r'आप', r'में', r'और', r'का', r'की', r'के', r'हूँ']

_PUNCTUATION = set(string.punctuation + '।॥…—–""''')

# ── Media tag patterns ────────────────────────────────────────────
# <music genre="jazz" duration="10">prompt text</music>
_MUSIC_RE = re.compile(
    r'<music\b([^>]*)>(.*?)</music>', re.DOTALL | re.IGNORECASE)
# <sing duration="15">lyrics to sing</sing>
_SING_RE = re.compile(
    r'<sing\b([^>]*)>(.*?)</sing>', re.DOTALL | re.IGNORECASE)
# <lyrics>song lyrics</lyrics>
_LYRICS_RE = re.compile(
    r'<lyrics\b[^>]*>(.*?)</lyrics>', re.DOTALL | re.IGNORECASE)

# ── Language marks ────────────────────────────────────────────────
# The model marks a part written in another language the way it marks a
# sung part (speech design Part A, review 1 MUST 2, 28 Nov 2026). One
# grammar, read the same by HARTOS tts_text_normalizer (which takes the
# marks out of every text a person reads) and pinned in both repos by
# tests/fixtures/speech_tags_cases.json:
#   <lang es>Hola</lang>     also <lang=es>, <lang="es">, <lang='es'>
# One form only, under a name that is ours. A bare <es>, <tr>, <id>, <it>
# or <my-app> is ordinary text: a table row, a placeholder, a C++ type
# (review of 714d77c0: the bare form took all of those for languages).
# A <lang ...> or </lang> tag is never spoken, whatever is inside it; the
# code is read from inside, and one that cannot be read, or that is no
# language in LANG_SCRIPTS, marks nothing.
_LANG_MARK_RE = re.compile(r'<(?P<close>/?)lang\b(?P<inside>[^<>]*)>',
                           re.IGNORECASE)
_LANG_CODE_RE = re.compile(
    r'(?:\s*=\s*|\s+)["\']?(?P<code>[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)["\']?\s*')

_ATTR_RE = re.compile(r"""(\w+)\s*=\s*['"]([^'"]*?)['"]""")

MAX_MEDIA_DURATION_S = 120  # Cap to prevent abuse via tag injection


def _parse_attrs(attr_str: str) -> dict:
    """Parse HTML-style attributes: genre="jazz" duration="10" → dict."""
    attrs = {}
    for m in _ATTR_RE.finditer(attr_str):
        key, val = m.group(1).lower(), m.group(2)
        if key == 'duration':
            try:
                val = min(int(val), MAX_MEDIA_DURATION_S)
            except ValueError:
                val = 30
        elif key == 'genre':
            # Sanitize: alphanumeric + spaces only (prevent injection)
            val = re.sub(r'[^a-zA-Z0-9 ]', '', val)[:50]
        attrs[key] = val
    return attrs


# ── Script detection ──────────────────────────────────────────────

def _get_script(char: str) -> str:
    if char in _PUNCTUATION:
        return 'punctuation'
    category = unicodedata.category(char)
    if category[0] in 'PSM' or category == 'Cf':
        # Punctuation, symbols, combining marks and joiners of any script
        # ('。', '¿', '€', an accent typed as its own mark, the zero-width
        # joiner inside a Malayalam or Sinhala word) stay with the run they
        # sit in: only letters decide a run's script.
        return 'punctuation'
    code = ord(char)
    for script, (start, end) in SCRIPT_RANGES.items():
        if start <= code <= end:
            return script
    for script, start, end in _EXTRA_RANGES:
        if start <= code <= end:
            return script
    return 'other'


def _scripts_of(language) -> frozenset:
    """The scripts the requested language is written in; empty when no
    language was asked for or it is not a supported one. 'zh-CN' and
    'pt_BR' are looked up by their base code."""
    code = (language or '').strip().lower().replace('_', '-')
    if not code:
        return frozenset()
    return LANG_SCRIPTS.get(code) or LANG_SCRIPTS.get(code.split('-')[0],
                                                      frozenset())


def _detect_devanagari_lang(text: str) -> str:
    mr = sum(1 for p in _MARATHI_PATTERNS if re.search(p, text))
    hi = sum(1 for p in _HINDI_PATTERNS if re.search(p, text))
    return 'mr' if mr > hi else 'hi'


def _script_to_lang(text: str, script: str) -> str:
    if script == 'devanagari':
        return _detect_devanagari_lang(text)
    return SCRIPT_TO_LANG.get(script, 'en')


# ── Core segmentation ────────────────────────────────────────────

def _segment_speech(text: str, language=None) -> list:
    """Split plain text into speech segments by script/language.

    With ``language``, every run of letters written in that language's
    script (LANG_SCRIPTS) is one segment in that language, even across
    scripts the language mixes (Japanese kanji and kana). Other runs get
    the script guess, as they do with no language."""
    if not text or not text.strip():
        return []

    requested_scripts = _scripts_of(language)
    script_chunks = []
    current_chunk = ''
    current_script = None

    for char in text:
        if char.isspace():
            if current_chunk:
                current_chunk += char
            continue

        if char.isdigit():
            current_chunk += char
            continue

        script = _get_script(char)

        if script == 'punctuation':
            current_chunk += char
            continue

        if script in requested_scripts:
            script = _REQUESTED

        if current_script is None:
            current_script = script
            current_chunk = char
        elif script != current_script:
            if current_chunk.strip():
                script_chunks.append((current_chunk.strip(), current_script))
            current_chunk = char
            current_script = script
        else:
            current_chunk += char

    if current_chunk.strip():
        # No letters at all ('123', '!!'): nothing contradicts the
        # requested language, so it keeps it.
        script_chunks.append((current_chunk.strip(), current_script or (
            _REQUESTED if requested_scripts else 'latin')))

    result = []
    for chunk_text, script in script_chunks:
        if script == _REQUESTED:
            lang = language.strip()
        else:
            lang = _script_to_lang(chunk_text, script)
        if result and result[-1]['lang'] == lang:
            result[-1]['text'] += ' ' + chunk_text
        else:
            result.append({'type': 'speech', 'lang': lang, 'text': chunk_text})

    return result


def _extract_media_tags(text: str) -> list:
    """Extract <music>, <sing>, <lyrics> tags and interleaved text.

    Returns ordered list of tuples: ('text', str) | ('music', dict) | ...
    """
    # Collect all tag spans
    spans = []
    for m in _MUSIC_RE.finditer(text):
        attrs = _parse_attrs(m.group(1))
        spans.append((m.start(), m.end(), {
            'type': 'music',
            'text': m.group(2).strip(),
            'genre': attrs.get('genre', ''),
            'duration': attrs.get('duration', 30),
        }))
    for m in _SING_RE.finditer(text):
        attrs = _parse_attrs(m.group(1))
        spans.append((m.start(), m.end(), {
            'type': 'sing',
            'text': m.group(2).strip(),
            'duration': attrs.get('duration', 30),
        }))
    for m in _LYRICS_RE.finditer(text):
        spans.append((m.start(), m.end(), {
            'type': 'lyrics',
            'text': m.group(1).strip(),
        }))

    if not spans:
        return [('text', text)]

    # Sort by position, no overlaps expected
    spans.sort(key=lambda s: s[0])

    parts = []
    last = 0
    for start, end, seg in spans:
        if last < start:
            between = text[last:start]
            if between.strip():
                parts.append(('text', between))
        parts.append((seg['type'], seg))
        last = end
    if last < len(text):
        tail = text[last:]
        if tail.strip():
            parts.append(('text', tail))

    return parts


def has_language_mark(text: str) -> bool:
    """True when ``text`` holds a language mark, open or close: such text is
    spoken from its segments, never as written."""
    return bool(text) and _LANG_MARK_RE.search(text) is not None


def _read_language_marks(text: str, open_marks: list) -> list:
    """Cut ``text`` at its language marks: [(words, language or None), ...]
    in order, no mark left in any words.

    ``open_marks`` is the marks still open, carried across the parts of one
    message. An open mark runs to its '</lang>' or to the end of the
    message; '</lang>' closes the nearest open mark; a close with no open
    is dropped. The language is the code where LANG_SCRIPTS has it, else
    its base ('pt-BR' is 'pt', 'zh-Hans' is 'zh'). A mark whose code cannot
    be read or is no language there marks nothing: its words are read as
    unmarked text."""
    runs = []
    last = 0
    for mark in _LANG_MARK_RE.finditer(text):
        if mark.start() > last:
            runs.append((text[last:mark.start()],
                         open_marks[-1] if open_marks else None))
        last = mark.end()
        if mark.group('close'):
            if open_marks:
                open_marks.pop()
            continue
        read = _LANG_CODE_RE.fullmatch(mark.group('inside'))
        code = read.group('code').lower() if read else ''
        base = code.partition('-')[0]
        open_marks.append(code if code in LANG_SCRIPTS
                          else base if base in LANG_SCRIPTS else None)
    if last < len(text):
        runs.append((text[last:], open_marks[-1] if open_marks else None))
    return runs


def _add_speech(result: list, words: str, mark, language) -> None:
    """Add one run of a marked message to ``result``. Marked words are one
    speech segment in the marked language, whatever alphabet they are
    written in; unmarked words are split as any text is. A run next to a
    speech segment in the same language joins it."""
    if not words.strip():
        return
    if not any(ch.isalnum() for ch in words):
        # Only punctuation between two marks: it stays with the words
        # before it, never a segment with nothing to say.
        if result and result[-1].get('type') == 'speech':
            result[-1]['text'] += words.strip()
        return
    if mark:
        segs = [{'type': 'speech', 'lang': mark, 'text': words.strip()}]
    else:
        segs = _segment_speech(words, language)
    for seg in segs:
        if (result and result[-1].get('type') == 'speech'
                and result[-1]['lang'] == seg['lang']):
            result[-1]['text'] += ' ' + seg['text']
        else:
            result.append(seg)


def segment(text: str, language=None) -> list:
    """Split text into typed segments for TTS/music/singing routing.

    ``language`` is the language the caller asked to hear (e.g. 'es'). A
    speech run written in that language's script keeps it; without it,
    or for a run in another script, the language is guessed from the
    script.

    A part inside a language mark (<lang es>...</lang>) is
    spoken in that language whatever alphabet it is written in, and the
    mark is in no segment's text. A sung part inside a mark, or holding
    one around all its words, carries that language as 'lang'.

    Returns list of segment dicts. Each has 'type' key:
      speech: {'type': 'speech', 'lang': str, 'text': str}
      music:  {'type': 'music',  'text': str, 'genre': str, 'duration': int}
      sing:   {'type': 'sing',   'text': str, 'duration': int}
      lyrics: {'type': 'lyrics', 'text': str}
    """
    if not text or not text.strip():
        return []

    parts = _extract_media_tags(text)
    marked = has_language_mark(text)
    open_marks = []

    result = []
    for kind, data in parts:
        if not marked:
            if kind == 'text':
                # Plain text → split by language into speech segments
                result.extend(_segment_speech(data, language))
            else:
                # Media tag: already a complete segment dict
                result.append(data)
        elif kind == 'text':
            for words, mark in _read_language_marks(data, open_marks):
                _add_speech(result, words, mark, language)
        else:
            runs = _read_language_marks(data['text'], open_marks)
            data['text'] = ' '.join(w.strip() for w, _ in runs if w.strip())
            marks = {mark for words, mark in runs
                     if any(ch.isalnum() for ch in words)}
            if kind != 'music' and len(marks) == 1 and None not in marks:
                data['lang'] = marks.pop()
            result.append(data)

    return result
