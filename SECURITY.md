# Security Policy

## Reporting a vulnerability

Email **security@hertzai.com**. Do not open a public issue.

Include what you found, how to reproduce it, and what an attacker gets. If you
are unsure whether something counts, send it anyway — a false alarm costs us
ten minutes and the alternative costs more.

We will acknowledge within 3 working days and tell you whether we can
reproduce it. If we cannot, we will say what we tried rather than close it
silently.

## What is in scope

Nunba runs a model, a local web UI and up to 31 channel adapters on a user's
own machine, so the interesting boundaries are:

- **The local HTTP surface.** The desktop app serves on localhost. Anything
  reachable from another process, another user on the same host, or the LAN
  that should not be.
- **Channel adapters.** They accept input from Discord, WhatsApp, Telegram,
  email and others. Untrusted text reaching a code path that treats it as
  trusted is the shape we care about most.
- **Credential storage.** Provider API keys are encrypted at rest (AES-256,
  PBKDF2). Anything that recovers them, weakens the derivation, or writes them
  in the clear — including to logs.
- **Model and update supply chain.** Anything that lets a downloaded model,
  update or plugin execute code the user did not intend.
- **The privacy claim itself.** Nunba states that conversations do not leave
  the machine. A path that transmits user content without an explicit action
  is a security bug, not a feature request, and we will treat it that way.

## Out of scope

- Attacks needing physical access to an unlocked machine.
- Vulnerabilities in a model's *outputs* — a model saying something wrong is
  a quality issue, not a vulnerability.
- Reports from automated scanners with no demonstrated impact.

## Disclosure

Report privately, give us a reasonable window to ship a fix, then publish
whatever you like. We will credit you unless you ask us not to. We will not
ask you to stay quiet indefinitely, and we will not threaten anyone for
reporting in good faith.
