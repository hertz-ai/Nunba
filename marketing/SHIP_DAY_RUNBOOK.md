# Ship Day Runbook — from "funnel ready" to "first 100 users live"

This is the **sequenced, time-boxed** playbook to convert the infra
shipped on 2026-05-23 into actual installs.  Follow top to bottom.
Each step has a verify gate so you know it actually worked before
moving on.  Total wallclock: ~4–6 hours over 1–2 days.

---

## PHASE 0 — pre-flight (15 min, do today, before everything else)

### 0.1  Disk + RAM headroom

```powershell
Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" |
  ForEach-Object { "{0} GB free of {1} GB" -f
    [math]::Round($_.FreeSpace/1GB,1),
    [math]::Round($_.Size/1GB,0) }
```

**Required:** ≥ 15 GB free on C: (the cx_Freeze build needs ~10 GB scratch).
**If short:** clear `~/Documents/Nunba/cache/`, old log rotations in
`~/Documents/Nunba/logs/*.log.old`, or the
`~/.nunba/site-packages/torch*` if not currently needed.

### 0.2  Verify funnel is live in the real world

Open these URLs in a fresh incognito window — confirm each renders with
no console errors:

- [ ] https://hevolve.ai/  (Download CTA visible in hero, emerald button)
- [ ] https://hevolve.ai/download  (full product page, 6 features, sysreqs)
- [ ] https://hevolve.ai/blog  (3 post cards visible)
- [ ] https://hevolve.ai/blog/run-local-ai-on-8gb-ram  (the new technical post)
- [ ] https://hevolve.ai/join?ref=test  (green "Invited via referral code · test" chip shows)
- [ ] https://hevolve.ai/press  (media kit renders)

If ANY of these 404 or render broken: stop, fix, then resume.  Don't
send traffic to a broken funnel.

### 0.3  Verify the installer actually downloads

```powershell
Invoke-WebRequest -Method Head `
  -Uri "https://github.com/hertz-ai/Nunba/releases/latest/download/Nunba_Setup.exe"
```

**Required:** `StatusCode: 302` redirecting to a real
`releases/download/<tag>/Nunba_Setup.exe`.  The download Location header
must be valid.

---

## PHASE 1 — fresh build with the new fixes (~30–45 min)

The currently-published installer is from 2026-05-20.  This session
shipped 3 HARTOS fixes (`ed80375` LLM wire trim, `ea277cc` flywheel
tuning, `a0bdeb1` zombie_reaper tz-guard) that materially improve the
first-run experience.  Rebuild before mass distribution.

### 1.1  Trigger the build

```powershell
cd C:\Users\sathi\PycharmProjects\Nunba-HART-Companion
python scripts\build.py
```

**Verify gate:** at the end, you see:

- `Output\Nunba_Setup.exe` exists (~80 MB)
- `build\Nunba\BUILD_INFO.txt` shows the CURRENT main SHA (not 2026-05-20)
- No CRITICAL errors in the build log

### 1.2  Smoke-test the freshly built installer (5 min)

DO NOT mass-distribute without this.  On a clean Windows VM (or after
uninstalling current Nunba):

1. Run `Output\Nunba_Setup.exe`.  Installer wizard completes.
2. First launch.  Wait for model download (5–15 min).
3. Send one chat message.  Reply arrives within 2 seconds.
4. Open admin → check `BUILD_SHA` matches today's main.
5. Close + reopen.  State persists.  No crash dialogs.

If anything fails: fix, rebuild, retest.

### 1.3  Publish the new build to GitHub Releases

If your CI is wired to publish on push to main, this happens automatically
on every commit (see `build.yml` line 792).  Verify the latest release
on `https://github.com/hertz-ai/Nunba/releases` has today's date.

Otherwise:

```powershell
gh release upload "$(gh release list --limit 1 --json tagName -q '.[0].tagName')" `
  Output\Nunba_Setup.exe --clobber
```

---

## PHASE 2 — first wave of distribution (~2 hours, do Tuesday or Wednesday morning)

Pick **Tuesday or Wednesday 08:00–10:00 ET** for max US tech audience.
NOT Friday, NOT weekend.

### 2.1  Pre-warm 5 trusted contacts (15 min, do this first)

Send a personal message — not a broadcast — to 5 people in your network
who fit the early-adopter profile (local-LLM enthusiasts, privacy-tech
folks, developer-tools builders):

> Hey [name], finally shipping Nunba today.  Local AI agent, 8GB RAM
> works, 31 channel integrations.  Mind taking a look at
> https://hevolve.ai/download and trying the installer?  I'd love your
> honest first-30-seconds reaction before I post publicly later today.

**Why this matters:**
- Their feedback finds the install-funnel bug you missed
- When the public launch goes live they're warm + ready to upvote /
  retweet within the first 15 minutes (the most important window)

### 2.2  Submit Show HN (5 min, the highest-leverage single action)

Open `marketing/SHOW_HN.md`.  Copy:

- Title → HN title field (verify ≤80 chars)
- URL → HN url field
- Body → HN text field

Submit at https://news.ycombinator.com/submit.

**Within 60 minutes of submission:**

- [ ] Post a top-level comment from your account framing the project
      (the SHOW_HN.md has a checklist of what to address — pre-empt the
      "isn't this just ollama" question head-on)
- [ ] Respond to every reply within 15 minutes for the first 90 minutes
- [ ] Drop 1 screenshot in a follow-up comment

**Verify gate:** the post is on /show or /newest.  Don't refresh
obsessively — engage with comments instead.

### 2.3  Post the Twitter / X thread (10 min)

Open `marketing/TWITTER_LAUNCH.md`.  Post the 8 tweets in sequence with
~30 seconds between each (avoid X's spam detector).  Pin tweet 1.

DM the thread URL to your 5 pre-warmed contacts and to 5 others in the
local-LLM Twitter community (Ollama maintainers, llama.cpp contributors,
Qwen team @ Alibaba) — personalized, not broadcast.

### 2.4  LinkedIn (10 min)

Open `marketing/LINKEDIN_LAUNCH.md`.  Paste verbatim.  Tag 3–5 specific
people you trust who fit the audience.  Reply to comments within 30
minutes for the first hour.

### 2.5  3 direct press emails (45 min — the slowest step, most leverage)

Open `marketing/PRESS_OUTREACH_EMAILS.md`.  Pick template A/B/C based on
the outlet.  Personalize the bracketed `[fields]` — reference a SPECIFIC
recent piece they wrote.

Send to 3 outlets (one each):
- 1 architecture/dev outlet (Template A) — e.g. Latent Space, Ben's Bites
- 1 privacy outlet (Template B) — e.g. EFF, Privacy International blog
- 1 dev-tools outlet (Template C) — e.g. The New Stack, InfoQ

**Critical:** ONE outlet per template per session.  Don't BCC.  Don't
blast.

---

## PHASE 3 — monitor + respond (rest of day 1 + day 2)

### 3.1  Watch the install counter

```bash
curl -s https://hevolve.ai/api/social/marketing/stats | jq .
```

The counter on `https://hevolve.ai/` updates live as installs come in
(InstallCounter component fetches every page-load).

**Targets (rough — calibrate from your actual numbers):**

| Hour after Show HN | Installs (front-page hit) | Installs (decent post) |
|---|---|---|
| 1 h  |  20–100  |  5–20   |
| 6 h  |  100–500 |  20–80  |
| 24 h |  300–2000|  50–200 |
| 1 wk |  500–5000|  100–500|

If installs spike past 100/hour: you're on the HN front page.  Be in
the comments.  Press response will follow.

### 3.2  Reply to every press inquiry within 1 hour

Press cycles are short.  A journalist who emails Tuesday and doesn't
hear back by Thursday is writing about somebody else.

### 3.3  Day 2: follow-up wave

If day-1 installs cleared 100: send 5 more press emails (different
outlets, same templates).  Post a "what we learned in 24 hours" thread
on Twitter / LinkedIn — these always do well as a second-wave content
piece.

If day-1 installs were low: triage WHY before posting again.  Most
likely cause:
- Installer broke for users (check ~/Documents/Nunba/logs/ from anyone
  who reports failure)
- Landing-page CTA confusion (check session recordings if you have any)
- Wrong audience (HN post on wrong day; press emails to mismatched
  outlets)

---

## PHASE 4 — sustainable engine (week 2 onwards)

By end of week 1 you should have:
- A baseline daily install rate
- ≥1 piece of organic coverage
- ≥10 users in your install counter
- ≥3 conversations with journalists who didn't yet write but might

Week 2 priorities, in order:

1. **macOS + Linux builds** — broadens TAM by ~30% immediately
2. **One new SEO blog post per week** — sustainable content engine,
   each post is a new search-door (the `blog-post.<n>.md` pattern is
   already wired)
3. **Reach out to local-LLM community Discords** (Ollama,
   LocalLLaMA reddit, llama.cpp Discord) — paste the architecture
   writeup link, not the install link.  Lead with technical depth.
4. **Set up a Nunba Discord** of your own at the 50-install mark.
   Community builds retention, retention builds word-of-mouth.

10K users is ~50–100× day-1 numbers.  Sustained week-over-week content
+ word-of-mouth + 1 viral moment gets there in 3–6 months of consistent
shipping.  This runbook gets you the first 100; the second 9,900 is the
flywheel you've already coded.

---

## DO NOT DO

- Do not edit / change the funnel URLs during launch day.  Whatever bug
  ships, ships — fix on day 2.
- Do not auto-tweet or auto-post.  Mission anchor: AI amplifies humans,
  doesn't replace them.  Every post is yours.
- Do not buy ads on day 1.  Validate organic conversion first; if the
  funnel converts at 5%+ then paid traffic compounds.  If it converts
  at <1% paid traffic just burns cash.
- Do not respond emotionally to negative HN comments.  Address the
  substance (every critique has a kernel of truth); ignore the snark.

---

**The funnel is ready.  The trigger is you running this runbook.**
