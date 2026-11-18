"""Every spawned llama-server keeps a bounded prompt cache in host RAM.

Measured on the owner's desktop 2026-11-05 23:05Z (39.7 GB RAM, 0.14 GB free):
- the main 4B server (:8080) held 15.2 GB private, and its log repeated
  "making room for prompt cache entry, removing oldest entry (size = ~160 MiB)",
  so its prompt cache was full at the cap;
- the caption server (:8081, 0.8B + mmproj) held 5.7 GB and grew by 86 MB a
  minute.
The installed build (llama.cpp 10330) documents
``--cache-ram N ... (default: 8192, -1 - no limit, 0 - disable)
(env: LLAMA_ARG_CACHE_RAM)``, and neither spawn passed it, so each server
could keep 8 GB of prompts.  The memory that left starved everything else on
the desktop.

The cap goes in the spawned environment for the reason the thinking-off
setting does (test_llama_think_off.py): an unknown CLI flag makes an older
llama-server exit, an unknown environment variable is ignored.  That file's
AST test already holds every spawn in llama_config.py to llama_child_env(),
so the cap reaches both servers.
"""
import os

from llama.llama_config import llama_child_env

# llama.cpp's own name for --cache-ram (llama-server --help), not ours.
CACHE_RAM_ENV = 'LLAMA_ARG_CACHE_RAM'
BUILD_DEFAULT_MIB = 8192


def test_a_spawned_server_gets_a_prompt_cache_cap(monkeypatch):
    # The owner's desktop carries this variable in its user environment
    # (set 2026-11-06 as the stopgap), so without removing it here the test
    # would pass on code that sets nothing.
    monkeypatch.delenv(CACHE_RAM_ENV, raising=False)
    value = llama_child_env().get(CACHE_RAM_ENV)
    assert value is not None, 'the spawned llama-server keeps the 8 GB default'
    assert value.lstrip('-').isdigit(), f'not a number of MiB: {value!r}'
    assert 0 < int(value) < BUILD_DEFAULT_MIB, (
        f'{value} MiB does not bound the cache below the build default')


def test_the_operators_own_setting_wins():
    assert llama_child_env({CACHE_RAM_ENV: '512'})[CACHE_RAM_ENV] == '512'
    assert llama_child_env({CACHE_RAM_ENV: '-1'})[CACHE_RAM_ENV] == '-1'


def test_the_cap_does_not_leak_into_this_process(monkeypatch):
    monkeypatch.delenv(CACHE_RAM_ENV, raising=False)
    llama_child_env()
    assert CACHE_RAM_ENV not in os.environ
