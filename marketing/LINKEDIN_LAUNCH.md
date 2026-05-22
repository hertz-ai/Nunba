# LinkedIn launch post — Nunba

**Paste-ready. Single LinkedIn post (3000-char limit) — heavier on
the why-it-matters framing for a more professional audience.**

---

Two years ago every AI app on your phone was somebody else's tenant.
Today most still are.  We just shipped one that isn't.

**Nunba** is a local-first AI agent that runs entirely on your laptop.
No subscription.  No usage cap.  No telemetry without your explicit
consent.  Voice + vision + chat + 31 channel integrations (Discord,
Slack, Telegram, WhatsApp, Teams, Matrix, Reddit, …).  Free.  Open
source.

The hard part wasn't the model — Qwen3-4B has been available for months.
The hard part was making a 4B-parameter language model feel responsive
on an 8GB laptop.  We did it with **speculative decoding**: a tiny 0.8B
"draft" model predicts the next 4–8 tokens, the 4B "main" model verifies
all of them in a single GPU pass.  Result: ~700ms first-token latency
on integrated graphics, ~12 tokens/sec sustained, ~35 tokens/sec on a
modest GPU.  Competitive with cloud inference, with the added
property that your data never leaves your machine.

Three design choices were non-negotiable for us:

— **Constitutional safety filter.** Every auto-improvement to the agent
passes a 32-trait cultural-wisdom filter before commit.  Safety beats
latency every time.

— **Federated, not federated-marketing.** Your friends' Nunba nodes
pool compute and share learnings via federated deltas, raw data never
leaves any machine.  The first *actually* federated personal AI.

— **Consent before presence.** When the agent joins your Discord room
or Teams meeting on your behalf, it announces itself.  No silent
observers.  Your guests can say "no AI" and the agent leaves with a
farewell.

Why this matters: the AI economy that treats your private conversations
as training material for somebody else's quarterly numbers is a dead
end.  The AI that *amplifies you*, learns *with* you, and *belongs to
you* — that's the future I want to build with.

Free download for Windows (signed installer, ~80MB):
https://hevolve.ai/download

macOS and Linux builds are in beta — DM me for early access.

Source on GitHub:
https://github.com/hertz-ai/Nunba

The architecture writeup, including the speculative-decoding pipeline:
https://hevolve.ai/blog/run-local-ai-on-8gb-ram

If you build with Nunba, let me know.  We're at the early-user stage
and every install matters.

#AI #LocalAI #LLM #PrivacyByDesign #OpenSource

---

## After-post checklist

- [ ] Tag 5 thoughtful people in your network who'd appreciate the
      privacy / local-first angle (not 50 — quality > breadth)
- [ ] In comments, respond to every reply within 30 minutes for the
      first hour (LinkedIn's algorithm rewards rapid engagement)
- [ ] Send DMs (not the post) to 10 specific people you know who'd
      install it — personal beats broadcast 10x on LinkedIn
- [ ] If post crosses 500 reactions, write a follow-up "What we
      learned from launch week" post 7 days later

## Timing

- **Tuesday/Wednesday/Thursday, 09:00–10:30 your local time** — peak
  LinkedIn engagement for tech professionals
- Avoid Friday afternoon and weekends
