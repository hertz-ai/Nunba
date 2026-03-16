# LLM Routing

Nunba uses a multi-tier routing system to process chat messages, balancing speed, intelligence, and reliability.

## Routing Tiers

### Tier 1: Deterministic Intent Detection (chatbot_routes.py)

Fast, rule-based pattern matching. No LLM needed.

- **Greetings**: "hello", "hi", "hey" → template response
- **Abusive language**: profanity filter → polite rejection
- **Agent creation**: "create an agent", "build me a bot" → creation pipeline
- **Negation guards**: "don't create", "no I meant" → prevents false triggers

Response time: < 10 ms

### Tier 2: LangChain Agent (hart_intelligence, port 6778)

Full-featured AI with tools, memory, and conversation history.

```
chatbot_routes.py → POST :6778/chat → LangChain Agent
                                         ├── Web Search tool
                                         ├── Visual Context (camera) tool
                                         ├── Memory tools (remember, recall)
                                         ├── Agent creation tools
                                         └── LLM backend → llama.cpp :8080
```

Features:
- **Tools**: Web search, visual context, memory graph, agent creation
- **Memory**: Conversation history + semantic memory graph
- **Prompts**: Hevolve system prompt with cultural wisdom layer
- **Prompt routing**: `prompt_id=None` → regular chat, `prompt_id=<id>` → specific agent

Response time: 1-10 seconds (depends on tools used)

### Tier 3: Raw llama.cpp (port 8080)

Direct LLM inference without tools or memory. Used as fallback.

```
chatbot_routes.py → POST :8080/v1/chat/completions
```

- No tools, no memory, no system prompt enrichment
- Fastest LLM response path
- Used when LangChain service is down

Response time: 0.5-5 seconds

## Cloud Routing (Optional)

When connected to Hevolve cloud:

```
React → azurekong.hertzai.com/chat/custom_gpt
         → chatbot_pipeline → gpt_lang()
         → hart_intelligence → Azure GPT
```

The frontend detects cloud availability via the backend health endpoint and routes accordingly.

## Agent Creation Pipeline

When the user requests agent creation (detected via Tier 1 or Tier 2):

```
1. Intent detected: "create an agent for X"
2. prompt_id assigned (or existing agent reused)
3. Autonomous mode: backend drives gather_info → create_recipe
4. Frontend auto-sends "proceed" every 1.5s
5. Status lifecycle: Creation → Review → Evaluation → Completed
6. Completed agent added to agent list for reuse
```

## Configuration

### `casual_conv` Flag

The `casual_conv` parameter in `hevolve_backend_adapter.py` controls tool availability:

- `casual_conv=False` (default) → all LangChain tools enabled
- `casual_conv=True` → tools disabled, chat-only mode

!!! warning
    Setting `casual_conv=True` silently disables ALL tools (web search, visual context, memory, etc.). This was a known bug that caused tools to appear broken.

### Intelligence Preference

Users can set their preferred LLM routing in the frontend:

| Preference | Behavior |
|------------|----------|
| `auto` | Use local LLM first, fall back to cloud |
| `local_only` | Never use cloud, even if local LLM is slow |
| `hive_preferred` | Prefer cloud LLM (Azure GPT) when available |

Stored in `localStorage` as `intelligencePreference`.
