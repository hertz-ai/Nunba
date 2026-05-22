# Twitter / X launch thread — Nunba

**Paste-ready. Each tweet is sized to fit X's 280-char limit (with link added).**

---

## Pinned tweet (the hook)

```
We just shipped Nunba — a local AI agent that runs on your laptop.

8GB RAM. No subscription. No telemetry. 31 channels (Discord, Slack,
Telegram, WhatsApp, Teams…) joinable with consent.

Qwen3-4B + 0.8B draft, sub-700ms first token via speculative decoding.

https://hevolve.ai/download
```

## Thread tweet 2/8

```
Why local?

Your AI shouldn't need a $20/mo subscription to remember what you
said yesterday.  Shouldn't ship your chat to a third party.  Shouldn't
go offline because someone's quarterly numbers changed.

Nunba: your machine.  Your data.  Free forever.
```

## Thread tweet 3/8

```
The speculative-decoding pair is the unlock.

A 0.8B draft model predicts 4-8 tokens ahead; the 4B main model verifies
in one pass.  When the draft is right (~65% of the time on chat data),
you get 4-8 tokens for the price of 1 step.

How it fits in 8GB:
https://hevolve.ai/blog/run-local-ai-on-8gb-ram
```

## Thread tweet 4/8

```
31 channel adapters ship with Nunba.

Discord audio rooms.  Slack workspaces.  Telegram supergroups.
WhatsApp groups.  Teams meetings.  Matrix rooms.  Reddit.

Your local agent joins ON YOUR BEHALF — always with explicit consent,
always announces presence on entry.  No silent observers.
```

## Thread tweet 5/8

```
Federated, not federated-marketing.

Your friends' Nunba nodes pool compute + share learnings via
federated deltas.  Raw data never leaves any machine.

Every auto-improvement passes a constitutional filter
(hive_guardrails.py) before commit.  Safety > sovereignty > realtime
> throughput.
```

## Thread tweet 6/8

```
One conversation, three devices.

Canonical ConversationEntry table + cursor-pull
`/api/chat-sync/pull?since=<ulid>` + WAMP `chat.new`/`chat.ack`
per-user topics.

Web, desktop, Android — same timeline.  Offline replay built in.
File replication WhatsApp-style.
```

## Thread tweet 7/8

```
Stack:
- Flask + llama.cpp + Crossbar WAMP + cx_Freeze
- React SPA + React Native (Android)
- Local Qwen3-4B + 0.8B draft + F5/Kokoro/Indic Parler/CosyVoice TTS +
  Whisper STT + MiniCPM-V vision
- Cross-platform: Windows today (signed); macOS + Linux in beta

OSS: https://github.com/hertz-ai/Nunba-HART-Companion
```

## Thread tweet 8/8 (CTA)

```
Free.  Open source.  Local-first.  Privacy-by-design.  Federated learning
with constitutional safety.

Download for Windows:
https://hevolve.ai/download

macOS / Linux beta — reply to this thread for early access.

If you build with Nunba, tag us.  We boost.
```

## After-thread checklist

- [ ] Quote-RT the pinned tweet from your personal account
- [ ] DM 10 people in the local-LLM community (Ollama users, llama.cpp
      maintainers, Qwen team @ Alibaba)
- [ ] Drop the thread URL in: r/LocalLLaMA, r/selfhosted, r/privacy,
      r/MachineLearning (no spam — only where it fits)
- [ ] If thread crosses 100 reposts, write a Twitter Space invite
      ("Building local AI that's actually fast — AMA")

## Timing

- **Tuesday 09:00 ET** for max US tech-Twitter eyeballs.
- Avoid Friday/weekend (low engagement on dev Twitter).
