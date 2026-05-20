"""#215 — Verified-signal probe for LLM tool-call / structured-output.

verified_llm.py checks that the LLM returns non-empty content.  That
catches "model loaded but silent" but NOT "model returns malformed
tool_calls".  This module adds the schema-validation layer:

  1. Send a prompt that REQUIRES a tool call (e.g. "calculate 2+2,
     use the add function").
  2. Assert the response carries tool_calls[0] with a function name.
  3. Validate function.arguments parses as JSON.
  4. If a jsonschema is supplied, validate arguments against it.

Failure modes captured:
  * tool_calls array missing / empty (model ignored the tools)
  * function.arguments not valid JSON (mojibake / truncated)
  * arguments don't match the schema (wrong types / missing required
    fields)

jsonschema is an OPTIONAL dependency — when absent, we skip the
schema-validation step but still validate JSON parseability.  Tests
that depend on schema validation can install jsonschema; the basic
parseability check works everywhere.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Result:
    ok: bool
    tool_name: str = ""
    arguments: dict = field(default_factory=dict)
    err: str = ""
    elapsed_s: float = 0.0

    def __bool__(self) -> bool:
        return self.ok


# Default tools array — single "add(a, b)" function that any decent
# coding/tool-calling model can produce in response to a math prompt.
DEFAULT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "add",
            "description": "Add two integers and return their sum.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": {"type": "integer"},
                    "b": {"type": "integer"},
                },
                "required": ["a", "b"],
            },
        },
    },
]

DEFAULT_PROMPT = "Calculate 2+2 using the add function."


def verify_tool_call(endpoint: str = "http://127.0.0.1:8080",
                    tools: list | None = None,
                    prompt: str = DEFAULT_PROMPT,
                    schema: dict | None = None,
                    timeout_s: int = 30) -> Result:
    """Send a forced-tool-use prompt and verify the response carries
    a well-formed tool_call.

    Args:
        endpoint: OpenAI-compatible LLM endpoint (e.g. llama-server).
        tools:    Tools array per the OpenAI spec.  Defaults to the
                  single add(a, b) function which exercises a minimal
                  tool-call shape.
        prompt:   User-message text.  Must instruct the model to use
                  the tool.  Default explicitly names the function.
        schema:   Optional jsonschema dict.  When supplied + jsonschema
                  package is importable, validates function.arguments
                  against this schema.  Without schema, only JSON-
                  parseability is checked.
        timeout_s: Wall-clock cap.

    Returns:
        Result with ok=True iff the model returned a JSON-parseable
        tool_calls[0].function.arguments (matching schema if supplied).
    """
    if tools is None:
        tools = DEFAULT_TOOLS
        # Default schema = the tool's own parameters
        if schema is None:
            schema = DEFAULT_TOOLS[0]["function"]["parameters"]

    t0 = time.monotonic()
    payload = json.dumps({
        "messages": [{"role": "user", "content": prompt}],
        "tools": tools,
        "tool_choice": "auto",
        "max_tokens": 200,
        "temperature": 0.0,
    }).encode("utf-8")
    req = urllib.request.Request(
        endpoint.rstrip("/") + "/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError) as e:
        return Result(ok=False, err=f"{type(e).__name__}: {e}"[:200],
                      elapsed_s=time.monotonic() - t0)
    except Exception as e:
        return Result(ok=False, err=f"{type(e).__name__}: {e}"[:200],
                      elapsed_s=time.monotonic() - t0)

    elapsed = time.monotonic() - t0

    # Extract the tool_calls array.  OpenAI / llama-server places it
    # at choices[0].message.tool_calls.  When the model ignores the
    # tools and returns plain content, tool_calls is missing or [].
    try:
        msg = body["choices"][0]["message"]
        tool_calls = msg.get("tool_calls") or []
    except (KeyError, IndexError, TypeError) as e:
        return Result(ok=False, err=f"malformed response: {e}",
                      elapsed_s=elapsed)

    if not tool_calls:
        return Result(ok=False,
                      err="model returned no tool_calls (ignored the tools)",
                      elapsed_s=elapsed)

    tc = tool_calls[0]
    try:
        fn = tc.get("function") or {}
        tool_name = fn.get("name") or ""
        args_raw = fn.get("arguments")
    except Exception as e:
        return Result(ok=False, err=f"tool_call has no function: {e}",
                      elapsed_s=elapsed)

    if not tool_name:
        return Result(ok=False,
                      err="tool_call.function.name missing",
                      elapsed_s=elapsed)

    if args_raw is None or args_raw == "":
        return Result(ok=False,
                      tool_name=tool_name,
                      err="tool_call.function.arguments empty",
                      elapsed_s=elapsed)

    # arguments may already be a dict (some servers parse it) or a
    # JSON string (OpenAI canonical).  Handle both.
    if isinstance(args_raw, dict):
        arguments = args_raw
    else:
        try:
            arguments = json.loads(args_raw)
        except (ValueError, TypeError) as e:
            return Result(ok=False, tool_name=tool_name,
                          err=f"arguments not valid JSON: {e}",
                          elapsed_s=elapsed)

    # Optional schema validation
    if schema is not None:
        try:
            import jsonschema  # type: ignore
            try:
                jsonschema.validate(instance=arguments, schema=schema)
            except jsonschema.ValidationError as ve:
                return Result(ok=False, tool_name=tool_name,
                              arguments=arguments,
                              err=f"schema mismatch: {ve.message}"[:200],
                              elapsed_s=elapsed)
        except ImportError:
            # jsonschema not installed — fall through with parseability-only check
            pass

    return Result(ok=True, tool_name=tool_name, arguments=arguments,
                  elapsed_s=elapsed)
