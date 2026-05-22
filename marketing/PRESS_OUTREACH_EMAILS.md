# Press outreach email templates — Nunba launch

**Paste-ready.  Use the template that fits the outlet's beat.  Personalize
the bracketed `[fields]` before sending.**

---

## Template A — Hacker News / tech-Twitter analyst (the architecture angle)

**To:** [editor@hn-style-outlet.com]
**Subject:** A 4B-param LLM that feels like GPT on 8GB of RAM — speculative decoding writeup

Hi [first name],

I read your piece on [specific recent article they wrote — name the piece].
The framing on [specific argument they made] mapped exactly to a problem
we just shipped a solution for.

We just released **Nunba** — a local-first AI agent that runs Qwen3-4B
on an 8GB laptop and feels responsive.  The unlock is speculative
decoding: a 0.8B draft model predicts 4-8 tokens ahead, the 4B main
model verifies all of them in one pass.  ~700ms first-token, ~12 tok/s
sustained on integrated graphics.  Full architecture writeup here:

  https://hevolve.ai/blog/run-local-ai-on-8gb-ram

Three things I think you'd find interesting beyond the raw numbers:

  1.  **31 channel adapters ship in-box.**  The local agent joins your
      Discord audio room, Slack workspace, Telegram group — with
      explicit consent + announce-presence on entry.  No silent
      observers.

  2.  **Federated, not federated-marketing.**  Friends' Nunba nodes
      pool compute and share learnings via federated deltas (raw data
      never leaves any machine).  Constitutional filter on every
      auto-improvement before commit.

  3.  **Open source. $0/month.  No telemetry without consent.**  Source
      at github.com/hertz-ai/Nunba.

Press kit (one-liners, key numbers, founder quotes, screenshots):
https://hevolve.ai/press

Happy to do a 30-minute call to walk through the speculative-decoding
pipeline, the federated-learning design, or the consent model.  Or if
text is easier, fire questions and I'll respond same-day.

— Sathish
Founder, Hevolve AI
press@hevolve.ai

---

## Template B — Privacy / tech-policy outlet (the sovereignty angle)

**To:** [editor@privacy-outlet.com]
**Subject:** Local-first AI launch — your data never leaves your machine

Hi [first name],

[Specific recent piece they wrote on AI privacy/regulation] is exactly
the framing we built Nunba around.  The AI economy that treats private
conversations as training material for somebody else's quarterly
numbers is a dead end.

We just shipped **Nunba** — a local-first multimodal AI agent.  Voice,
vision, chat, 31 channel integrations.  Your data never leaves your
machine unless you explicitly send it.  Free, open source.

Specific privacy claims that are *engineering* claims, not marketing
copy:

  * Zero telemetry by default.  Opt-in via explicit consent UI per
    scope (camera, microphone, hive sharing, federated learning).
    Consent surfaces at `consent_service.py`.

  * Models run on the user's machine via llama.cpp.  No cloud
    inference unless the user explicitly chooses a provider.

  * Federated learning shares model *deltas*, not raw data.  Raw
    chat / vision / voice never crosses devices.

  * Open source — every claim is auditable.

Press kit: https://hevolve.ai/press
Download: https://hevolve.ai/download

I'd love to talk about how the consent model is implemented in code
(it's a real engineering surface, not a checkbox), or about the
constitutional filter that gates every auto-improvement.  Reply with
your earliest 30-minute window.

— Sathish
Founder, Hevolve AI

---

## Template C — Developer-tools outlet (the build angle)

**To:** [editor@dev-tools-outlet.com]
**Subject:** A cx_Freeze + llama.cpp + Crossbar WAMP desktop AI stack — postmortem worth covering?

Hi [first name],

If you're still covering desktop-AI stacks, the architecture for
Nunba (just shipped) is unusual enough to be worth a piece:

  * **cx_Freeze + python-embed bundle** packs a Flask backend + 31
    channel adapters + llama.cpp + Whisper + 6 TTS engines into a
    signed ~80MB Windows installer.  Build pipeline at
    .github/workflows/build.yml in the OSS repo.

  * **llama.cpp speculative decoding pair**: Qwen3-4B (main) +
    Qwen3-0.8B (draft) for sub-700ms first-token on 8GB RAM.
    Writeup: https://hevolve.ai/blog/run-local-ai-on-8gb-ram

  * **Crossbar WAMP for realtime** — every chat / agent event /
    UI update goes through one WAMP router.  Per-user topic
    authorization.  Web Worker on the client.

  * **Federated learning leg** via FederatedAggregator.broadcast_delta
    + constitutional filter gate at hive_guardrails.py.

  * **Three topology modes** from the same codebase: flat (single
    desktop, SQLite), regional (LAN, MySQL), central (cloud).

Source: https://github.com/hertz-ai/Nunba
Download: https://hevolve.ai/download

Happy to give you walkthrough access — every claim is in the public
source.

— Sathish
Founder, Hevolve AI

---

## Outreach hygiene checklist (read before sending ANY of these)

- [ ] **Personalize the opening reference.**  Generic mass emails get
      ignored.  One specific reference to their recent work = 5-10x
      response rate.
- [ ] **One outlet at a time.**  Don't BCC.  Don't blast.
- [ ] **Specific 30-minute call ask** at the end.  "Reply if interested"
      is too vague.
- [ ] **Reply within 1 hour** when they respond.  Press cycles are
      short.
- [ ] **Embargo offer for big pieces.**  If they bite, offer 24-48h
      embargo so their piece publishes before competing outlets.
- [ ] **Track in a spreadsheet:** outlet, journalist, sent-date,
      response, published-date, install-spike — measure what works.

## Targets to consider (suggestions, not exhaustive)

- **Hacker News:** doesn't take press emails, but `simonw` / `pg` /
  `dang` reading the linked Show HN at the right time = front page.
- **The Verge / Ars Technica:** privacy + local-first angle
- **TechCrunch:** founder-story angle (if the founder narrative is
  strong)
- **Wired:** federated learning angle
- **The Decoder / Marktechpost / VentureBeat AI:** technical depth
- **Independent dev-news Substacks** (Latent Space, Last Week in AI,
  Ben's Bites): often the highest conversion ratio because their
  readers are *exactly* the early-adopter local-LLM audience.
