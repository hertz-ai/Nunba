# LLM Routing

Nunba uses a draft-first routing architecture where every chat message hits the 0.8B draft model first. The draft either responds directly (casual chat) or signals the 4B main model to handle it (tool-assisted reasoning).

## Architecture Overview

```
User message
  → chatbot_routes.py (casual_conv=True by default)
    → hartos_backend_adapter.chat()
      → HARTOS /chat endpoint
        → speculative_dispatcher.dispatch_draft_first()
          → 0.8B Qwen3.5 on :8081 (~300ms)
            ├── casual_conv=True + confidence ≥ 0.85 → DRAFT RESPONDS DIRECTLY
            ├── delegate=local → re-dispatch to 4B LangChain Agent
            ├── is_create_agent=true → autogen agent creation pipeline
            └── channel_connect=<channel> → channel connection flow
```

## Routing Tiers

### Tier 0: Draft-First Classifier (0.8B on :8081)

The 0.8B Qwen3.5 model is the ONLY intent classifier. No Python-side regex, no keyword tables, no deterministic pattern matching. The draft receives an augmented prompt with JSON schema instructions and returns a structured envelope:

```json
{
  "reply": "Hey! How can I help?",
  "delegate": "none",
  "is_casual": true,
  "is_correction": false,
  "is_create_agent": false,
  "channel_connect": null,
  "language_change": null,
  "confidence": 0.95
}
```

- `delegate: "none"` + `confidence >= 0.85` → draft reply returned directly
- `delegate: "local"` → escalates to 4B LangChain Agent with tools
- `is_create_agent: true` → routes to autogen agent creation
- `language_change: "ta"` → overrides preferred_lang, persists to hart_language.json

Response time: ~300ms (pinned in VRAM, never evicted)

### Tier 1: LangChain Agent (4B on :8080)

Full-featured AI with tools, memory, and conversation history. Only invoked when the draft escalates (`delegate: "local"`) or when `casual_conv=False` (agentic flows).

```
HARTOS /chat (casual_conv=False)
  → LangChain Agent (CustomGPT on :8080)
    ├── Web Search tool
    ├── Visual Context (camera) tool
    ├── Memory tools (remember, recall)
    ├── Shell_Command tool
    ├── Agent creation tools
    ├── Calculator, Full History, etc.
    └── LLM backend → llama.cpp 4B on :8080
```

Response time: 1-10 seconds (depends on tools used)

### Tier 2: Raw llama.cpp (port 8080)

Direct LLM inference without tools or memory. Used as fallback when HARTOS is still loading.

Response time: 0.5-5 seconds

## `casual_conv` Flag

The `casual_conv` parameter controls which model handles the request:

- `casual_conv=True` (default for plain chat) → routes to 0.8B draft via `DRAFT_GPT_API`
- `casual_conv=False` (agentic flows) → routes to 4B main via `GPT_API` with full tool chain

**When is `casual_conv=False`?** When any of these are set:
- `agent_id` / `prompt_id` (specific trained agent)
- `create_agent=True`
- `agentic_execute=True`
- `agentic_plan` is set
- `autonomous_creation=True`

## Model Lifecycle

| Model | Port | VRAM | Lifecycle | Purpose |
|-------|------|------|-----------|---------|
| 0.8B Qwen3.5 (draft) | :8081 | ~1.5GB | `pinned=True` (never evicted) | Chat classifier + casual replies |
| 4B Qwen3.5 (main) | :8080 | ~3.5GB | `pressure_evict_only=True` | Tool-assisted reasoning |
| STT/TTS/VLM | varies | varies | Default (idle eviction) | One-shot tasks |

## Endpoint Resolution

Both `GPT_API` (4B) and `DRAFT_GPT_API` (0.8B) resolve via `_resolve_llm_endpoint`:

1. `core.port_registry.get_local_llm_url()` / `get_local_draft_url()`
2. Env var fallback: `HEVOLVE_LOCAL_LLM_URL` / `HEVOLVE_LOCAL_DRAFT_URL`
3. Appends `/chat/completions` to the base URL

## Authentication (Tier-Based)

| Tier | `HEVOLVE_NODE_TIER` | `/chat` auth | Body user_id |
|------|---------------------|--------------|--------------|
| Flat (desktop) | `flat` (default) | Optional | Accepted |
| Regional (LAN) | `regional` | JWT required | Rejected (401) |
| Central (cloud) | `central` | JWT required | Rejected (401) |

## Intelligence Preference

Users can set their preferred routing in the frontend:

| Preference | Behavior |
|------------|----------|
| `auto` | Use local LLM first, fall back to cloud |
| `local_only` | Never use cloud, even if local LLM is slow |
| `hive_preferred` | Prefer cloud LLM (Azure GPT) when available |

Stored in `localStorage` as `intelligencePreference`.
