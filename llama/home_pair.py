"""The one rule for NUNBA_TEST_HOME, "<the person's home><os.pathsep><folder>".

llama.llama_installer.home_dir reads by it, and tests/hermetic_run.install()
checks a value a run set itself against it, so the two cannot disagree: on
24 Nov 2026 install() kept a value home_dir did not honour and a test run
wrote the owner's real ~/.nunba/llama_config.json.

Standard library only and nothing at import: a test runner loads this file
before it imports anything of Nunba's.
"""
import os


def stand_in(value, home):
    """The folder that stands in for ``home``, or '' when ``value`` names none.

    It does only while its first part is ``home`` itself, so a test that
    moves home keeps the home it chose.  Anything less than that pair (unset,
    one part, an empty part, another home first) is ''.
    """
    person, _, private = (value or '').partition(os.pathsep)
    if person and private and (os.path.normcase(os.path.abspath(person))
                               == os.path.normcase(os.path.abspath(str(home)))):
        return private
    return ''
