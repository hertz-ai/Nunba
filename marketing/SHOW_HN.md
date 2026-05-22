# Show HN: Nunba — local-first AI agent (Qwen3-4B + 0.8B draft + 31 channel adapters) for Windows

**Paste-ready draft. Submit at https://news.ycombinator.com/submit (you must be logged in).**

---

## Title (80 char max — HN cuts at 80)

```
Show HN: Nunba – Local-first multimodal AI agent for Windows (free, open source)
```

## URL

```
https://hevolve.ai/download
```

(NB: HN strips UTM params and noindex pages from indexing — `/download` is the canonical conversion page.)

## Text body

```
Nunba is a desktop AI agent that runs entirely on your machine.  Qwen3-4B
main + Qwen3-0.8B draft via llama.cpp's speculative decoding (sub-700ms
first token on 8GB RAM, ~12 tok/s sustained); F5/Kokoro/Indic Parler/
CosyVoice TTS with Piper as a CPU fallback; Whisper STT; MiniCPM-V for
vision.  Free, no subscription, no telemetry without explicit consent.

What makes it different from other local-LLM front-ends:

  * 31 channel adapters (Discord, Slack, Telegram, WhatsApp, Teams,
    Matrix, Reddit, …) — your local agent participates in the rooms
    you actually use, with explicit consent + announce-presence on
    join.  We don't think a private AI should be a silent observer.

  * Speculative decoding pair so the 4B model feels responsive on 8GB
    machines.  Writeup of the pipeline:
    https://hevolve.ai/blog/run-local-ai-on-8gb-ram

  * Optional federated hive — your friends' Nunba nodes pool compute
    and share learnings via federated deltas (raw data never leaves
    your machine).  Constitutional filter on every auto-improvement
    before commit.

  * Cross-device chat sync (web/desktop/RN) on a canonical
    ConversationEntry table — same conversation, three devices, full
    offline replay.

It's Windows-first today (signed installer via Azure Trusted Signing,
~80MB).  macOS + Linux builds are in beta; DM me on HN if you want
early access.

Tech stack: Flask + llama.cpp + Crossbar WAMP + cx_Freeze; React SPA;
React Native on Android.  Source on GitHub:
https://github.com/hertz-ai/Nunba-HART-Companion

Happy to answer any questions about the architecture, the speculative
decoding gains, the privacy model, or the federated-learning design.
```

## After-post checklist

- [ ] Pin a top-level comment as the author: address the most common
      "what about ollama / lm studio / open-webui" framing head-on (we're
      bundling the agent layer + channels + auto-evolve loop, not just
      an LLM runner).
- [ ] Watch for the first 10 comments, respond within 60 minutes to
      every one — early engagement is the single biggest predictor of
      front-page reach.
- [ ] Have screenshots ready (the Download page hero, the
      `meet_copilot` Liquid UI card if shown, the social feed).  Don't
      paste them into the text — drop them in a follow-up comment so
      the post text stays scannable.
- [ ] If it lands on front page, the funnel is ready to absorb:
      `/download`, `/blog`, `/join` are all live with full SEO + JSON-LD.
      Install counter pulls from `/api/social/marketing/stats`.

## Best time to submit

- **Tuesday/Wednesday, 08:00–10:00 ET** (peaks of HN US-morning traffic)
- Avoid weekends (low engagement) and Mondays (always swamped).
