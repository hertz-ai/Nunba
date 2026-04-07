# Hevolve Sales Outreach: Embodied AI Manufacturers
**Generated:** March 25, 2026 | **Research Sources:** Web, GitHub, Local Codebase

---

## ICP (Ideal Customer Profile)

**Who:** Robotics / embodied AI companies building humanoid or autonomous robots that need an on-device AI runtime — especially those NOT yet locked into a single LLM vendor (OpenAI, Google DeepMind, Alibaba Qwen, etc.).

**Why HARTOS fits:** These companies are building hardware bodies but need a brain. HARTOS provides a complete on-device agentic AI stack: multi-tier LLM routing, vision, speech (TTS + STT), memory graph, agent orchestration, and P2P compute sharing — all running locally with zero cloud dependency. This is exactly what embodied AI needs: low-latency, privacy-preserving, continual grounded learning on the edge.

**The deeper pitch — why Hive, not just "on-device":**
Every other AI stack in robotics is controlled by one company. OpenAI decides how Figure thinks. Google DeepMind decides how Apptronik reasons. Alibaba Qwen decides how Unitree perceives. Your robot's brain belongs to someone else's roadmap, pricing, and priorities.

HARTOS is architecturally different. The Hive evolves democratically — through collective participation, continual grounded learning from real-world interactions, and P2P compute sharing across a federated network. No single entity controls the stack. Robots learn from their environments, share intelligence across the Hive, and evolve together — while humans always retain decision authority (humanity-first guardrails, built into the core).

This isn't just a technical choice. It's a governance choice. The robotics company that partners with Hive owns their AI future. The ones that partner with OpenAI/Google/NVIDIA rent it.

**Pain points HARTOS solves:**
- Cloud-dependent AI stacks add latency and fail when connectivity drops
- Proprietary foundation model partnerships lock companies into vendor ecosystems — one company controls your robot's brain
- No open, democratically evolving runtime OS exists for on-device multimodal agent orchestration
- Robots need continual grounded learning from real-world interaction, not just pre-training from one company's data
- Centralized AI creates single points of failure and dependency — Hive distributes intelligence across the network

**The Hive Flywheel (why early partners win disproportionately):**
```
More nodes → more real-world data → better model
Better model → more users → more revenue
More revenue → more providers join → more nodes
More nodes → more coding agents → faster code evolution
Faster evolution → better architecture → better model
```
Early robotics partners don't just get HARTOS — they get a compounding advantage. Every robot they deploy becomes a node in the Hive. More nodes = more real-world data = a model that gets smarter for THEIR use cases. Latecomers join a network that was already optimized for someone else's deployments.

**Excluded (existing LLM partnerships):**
- Figure AI (OpenAI), Apptronik (Google DeepMind + NVIDIA GR00T), 1X Technologies (OpenAI-backed), Unitree (Alibaba Qwen), Agility Robotics (NVIDIA foundation models), Boston Dynamics (FieldAI partnership)

---

## Target Prospects (Tier 1)

### 1. Fourier Intelligence (Shanghai, China / Global)

**Why they're a fit:** Fourier builds the GR-2 humanoid with an open SDK (ROS-compatible) and no exclusive LLM partnership. They use NVIDIA Isaac for simulation/training only — their on-device runtime is wide open. They've publicly stated they want developers to focus on innovation while Fourier handles hardware. HARTOS fills the exact gap: the on-device reasoning layer developers need.

**Hook:** GR-2's SDK supports ROS and multiple simulation frameworks, but the on-device agent intelligence layer — reasoning, memory, speech, multi-agent orchestration — is developer-built. HARTOS could be the standard runtime that sits on top of GR-2, giving developers a complete agent brain out of the box.

**Target:** Zen Koh (CEO/Founder) or Head of Software Platform

**Research findings:**
- GR-2: 1.75m, 63kg, 53 DOF, 3kg single-arm payload
- Open SDK compatible with ROS, NVIDIA Isaac Lab, Mujoco
- NVIDIA Isaac used for simulation only — no exclusive LLM deal
- Recently launched first humanoid care robot with emotional AI focus
- Global presence (Shanghai, Singapore, Germany)

---

### 2. Enchanted Tools (Paris, France)

**Why they're a fit:** Enchanted Tools deploys Mirokai in healthcare — hospitals, pediatric oncology, elderly care. Healthcare is THE use case where privacy-first, fully on-device AI is non-negotiable. They already use a "multi-LLM" approach (not locked to one vendor), which means they're open to better runtime solutions. HARTOS's local-everything architecture is a perfect fit.

**Hook:** A robot in a hospital room with a child undergoing radiotherapy cannot send patient interaction data to the cloud. HARTOS's fully on-device architecture — local LLM inference, local speech, local vision, semantic memory — was designed for exactly this kind of sensitive, high-trust environment.

**Target:** Jerome Monceaux (CEO/Founder) or CTO

**Research findings:**
- Mirokai ES: social robot with multi-LLM integration, vision-language models
- First customer delivered; deploying in B2B healthcare starting 2026
- Partnership with Institut du Cancer de Montpellier (pediatric oncology)
- Partnership with APREH for care environments
- Training at Accenture for enterprise integration
- Multi-language emotional speech synthesis
- Goal: broader public accessibility by 2029

---

### 3. NEURA Robotics (Metzingen, Germany)

**Why they're a fit:** NEURA is raising up to EUR 1B and has an open-source simulation platform (Neuraverse). Their Qualcomm Dragonwing partnership gives them hardware compute, but they don't have an exclusive LLM runtime deal. They need on-device agent software that runs on Qualcomm chips — HARTOS, with its llama.cpp backbone, runs on any compute platform.

**Hook:** Neuraverse is great for simulation and training, but robots need a runtime OS for real-world deployment. HARTOS bridges that gap — from simulated training in Neuraverse to on-device agent execution with continual grounded learning in the field. And it runs on Qualcomm Dragonwing just as well as NVIDIA Jetson.

**Target:** David Reger (CEO/Founder) or Head of AI/Software

**Research findings:**
- Raising EUR 1B funding round (March 2026)
- Qualcomm Dragonwing Robotics IQ10 partnership (hardware, not LLM)
- Bosch partnership for production integration
- Schaeffler partnership for actuator co-development
- Neuraverse: open-source simulation and training platform
- GFT Technologies: strategic software development partner
- 4S humanoid for industrial and service applications

---

### 4. Standard Bots (New York, NY)

**Why they're a fit:** Standard Bots is the largest U.S. industrial robotics company by units shipped, with 10x annual revenue growth. Their developer-first, AI-native approach with no-code programming and built-in 3D vision aligns perfectly with HARTOS's architecture. They're backed by Amazon and Samsung but have no exclusive LLM partnership.

**Hook:** RO1's no-code framework lets operators program by demonstration, but the agent intelligence layer — reasoning about multi-step tasks, remembering context across sessions, adapting to new environments — needs a runtime. HARTOS provides that: a complete on-device agent brain that learns on the job, with sub-10ms deterministic responses for routine tasks and full agent reasoning when needed.

**Target:** Evan Beard (CEO/Co-founder) or Head of AI

**Research findings:**
- RO1: 6-axis cobot, 18kg payload, +/-0.025mm repeatability
- $63M Series B (July 2024) led by General Catalyst
- Backed by Amazon Industrial Innovation Fund, Samsung Next
- 10x annual revenue growth, 20x robot orders growth
- No-code programming, built-in 3D camera vision
- Developer-first approach, open to integrations

---

## Target Prospects (Tier 2)

### 5. Collaborative Robotics — co.bot (Santa Clara, CA)
- Proxie robot for logistics and warehousing
- Founded by Brad Porter (ex-Amazon VP Robotics)
- $140M+ total funding, General Catalyst led
- Hook: Proxie needs on-device adaptation per deployment site. HARTOS's memory graph lets the robot learn facility-specific workflows without cloud retraining.

### 6. Sanctuary AI (Vancouver, Canada)
- Phoenix humanoid, Carbon AI cognitive architecture
- Magna International partnership for automotive manufacturing
- Caveat: They have their own proprietary AI (Carbon) — but Carbon uses external LLMs for general knowledge. HARTOS could serve as the on-device runtime layer underneath Carbon.
- Hook: As Phoenix deploys across Magna's global factories, HARTOS could handle the local agent execution and memory while Carbon handles higher-level cognition.

---

## FOMO Strategy

Before the emails — here's the psychological framework driving each message:

| FOMO Lever | How It's Used |
|------------|---------------|
| **Market window closing** | The on-device agent runtime layer is being defined RIGHT NOW (2026). Whoever partners first sets the standard. |
| **Competitor awareness** | Subtly signal that we're talking to multiple robotics companies. First partner gets exclusivity in their vertical. |
| **Regulatory inevitability** | EU AI Act, healthcare data regs, and factory floor data sovereignty are making on-device AI mandatory — not optional. |
| **Ecosystem lock-out** | The company that embeds HARTOS first gets their developers building on it. Latecomers adopt someone else's ecosystem. |
| **Scarcity** | We're selecting ONE launch partner per vertical. Not selling to everyone. |

---

## Email Drafts

### Email 1: Fourier Intelligence

**To:** Zen Koh / Head of Software Platform
**Subject:** quick question about GR-2's AI stack

---

Hi Zen,

I've been following what Fourier's doing with GR-2, and one thing stands out to me. Figure locked into OpenAI. Apptronik went with Google DeepMind. Unitree picked Alibaba Qwen. All of them basically handed control of their robot's brain to someone else.

GR-2 hasn't done that yet. And honestly I think that's a huge advantage right now.

We built something called HARTOS (Hevolve Hive Agentic Runtime OS) that I think you'd want to look at. It's a full on-device AI runtime. Local LLM inference, vision, speech, semantic memory, multi-agent orchestration. But the part that really matters is this: it's not controlled by any single company.

The way it works is every robot running HARTOS becomes a node in what we call the Hive. More robots deployed means more real-world data feeding back into the system, which makes the model better, which brings more developers, which brings more robots. It compounds. And the early partners are the ones who shape how the intelligence evolves for their specific use cases.

So for GR-2, the more units you ship with HARTOS, the smarter every single GR-2 gets. That's not how it works if you go with OpenAI. With them, you just get whatever they decide to ship next quarter.

We're picking one humanoid partner to go deep with. Fourier is at the top of our list because of the open SDK philosophy. But we need to move on this soon.

Any chance you have 20 minutes this week?

Sathish
Founder, HevolveAI
hevolve.ai

---

**Subject alternatives:**
1. Figure chose OpenAI. You don't have to.
2. re: GR-2 AI runtime

---

### Email 2: Enchanted Tools

**To:** Jerome Monceaux / CTO
**Subject:** who controls Mirokai's brain?

---

Hi Jerome,

What you're doing at Institut du Cancer de Montpellier with Mirokai is incredible. A robot bringing comfort to kids going through radiotherapy. That's the kind of thing this industry should be about.

I want to bring up something that I think is going to become a big deal very fast. Right now every robotics AI stack out there is controlled by one company. OpenAI decides how Figure's robot thinks. Google decides how Apptronik's robot reasons. And if any of those companies change their pricing, deprecate a model, or just shift priorities... those robots are stuck.

For a robot sitting in a pediatric oncology ward, that's a real problem. Hospitals need to know that some company in San Francisco can't just push an update and change how the robot talks to their patients. And with the EU AI Act classifying healthcare AI as high-risk, regulators are going to start asking the same questions.

We built HARTOS to work completely differently. Everything runs on the device. Local LLM, local speech in 20+ languages, local vision, semantic memory. Nothing leaves the robot. Ever. But here's the bigger thing: the Hive (that's what we call our network) evolves through collective learning, not through one company's decisions. Every Mirokai you deploy gets smarter because it learns from real interactions. And that learning makes every OTHER Mirokai smarter too, while keeping patient data completely on-device.

We're looking for one healthcare robotics partner to build this with. A few other companies in the space have reached out, but Mirokai's actual hospital deployments make you the obvious fit. We need to pick our partner this quarter though.

Can we get on a call this week?

Sathish
Founder, HevolveAI
hevolve.ai

---

**Subject alternatives:**
1. on-device AI for hospital robots (before regulators force it)
2. re: Mirokai's AI architecture

---

### Email 3: NEURA Robotics

**To:** David Reger / Head of AI/Software
**Subject:** honest question before you deploy 1000s of robots

---

Hi David,

Congrats on the Qualcomm deal and the EUR 1B round. NEURA is clearly going after the platform play in cognitive robotics, and Neuraverse being open-source is a smart move.

But there's one question I'd want a clear answer to before deploying thousands of robots across Bosch and Schaeffler factories: who actually controls how the robot thinks once it's in the real world?

Because right now, most companies are just handing that over to one AI vendor. Figure's brain belongs to OpenAI. Apptronik's reasoning depends on Google DeepMind. If those companies change their pricing or deprecate a model or just decide to go in a different direction, those robots are completely at their mercy.

We built HARTOS to avoid that entirely. It's an on-device agentic runtime where the intelligence evolves through what we call the Hive. Not dictated by one company. Every NEURA robot deployed becomes a node. More nodes means more factory-floor data. Better data means a better model. Better model means smarter deployments everywhere. It's a flywheel that NEURA would actually own, not rent from somebody else.

On the technical side: 3-tier routing (sub-10ms for deterministic stuff, full agent reasoning when needed, raw LLM fallback), semantic memory for continual learning, full multimodal stack. Runs on Qualcomm Dragonwing, NVIDIA Jetson, whatever edge hardware you've got. Basically bridges the gap between training in Neuraverse and actually running in production.

We're picking one industrial robotics platform to integrate deeply with. NEURA is our first choice because of the open architecture and your partner ecosystem. But we need to lock this in during Q2 before someone else sets the runtime standard.

Got 20 minutes to see if the architectures fit?

Sathish
Founder, HevolveAI
hevolve.ai

---

**Subject alternatives:**
1. who should control how NEURA's robots think?
2. re: on-device runtime for Neuraverse

---

### Email 4: Standard Bots

**To:** Evan Beard / Head of AI
**Subject:** the RO1 moat that Chinese manufacturers can't copy

---

Hi Evan,

10x revenue growth. Most units shipped in the US. Standard Bots is clearly winning on accessibility. But here's what keeps me up at night when I think about the cobot market: hardware is commoditizing fast. Chinese manufacturers are pushing prices down every quarter.

The moat has to be software. Specifically, software intelligence that gets better the more you deploy.

And here's the problem with going the OpenAI or Google route: your robot's brain belongs to them. Their pricing, their roadmap. And worse, every competitor using the same API gets the exact same intelligence. Zero differentiation.

HARTOS gives you something they can't copy. Every RO1 deployed with HARTOS becomes a node in what we call the Hive. More robots deployed means more real-world manufacturing data. That data makes the model better. A better model attracts more developers to your platform. More developers means more use cases means more RO1 sales means more nodes. The flywheel keeps going, and it compounds specifically for Standard Bots because the learning comes from YOUR deployments and YOUR environments.

Nobody controls the stack. The Hive evolves through real-world grounded learning, democratically. And everything runs on-device. No cloud calls, no latency, no data leaving the factory floor.

Quick technical overview: semantic memory graph so the robot actually remembers across sessions, 3-tier reasoning (sub-10ms for routine stuff, full agent logic for complex tasks), multimodal support (vision, speech, local LLM). Designed to sit underneath RO1's no-code interface.

We're going deep with one cobot company. RO1's developer-first architecture makes Standard Bots our top pick. But we're talking to a couple other cobot makers and need to commit by end of Q2.

Worth a call this week to see if there's a fit?

Sathish
Founder, HevolveAI
hevolve.ai

---

**Subject alternatives:**
1. before every cobot has the same brain
2. re: RO1's AI layer

---

## LinkedIn Connection Requests (< 300 chars)

### Fourier Intelligence (Zen Koh)
Hi Zen, been following GR-2's open SDK approach. Most humanoid companies locked into OpenAI or Google already. We built an on-device AI runtime called HARTOS that might be a fit. Would love to connect.

### Enchanted Tools (Jerome Monceaux)
Hi Jerome, the Mirokai work in pediatric oncology is incredible. We built an on-device AI runtime for robots in sensitive environments like hospitals. Everything stays local. Would love to connect and share more.

### NEURA Robotics (David Reger)
Hi David, congrats on the Qualcomm deal. We're building HARTOS, an on-device agent runtime that bridges simulation training to real-world deployment. Think it could complement Neuraverse well. Would love to connect.

### Standard Bots (Evan Beard)
Hi Evan, what Standard Bots is doing with RO1 is impressive. We built an on-device AI runtime where every robot deployed makes the whole fleet smarter over time. Could be a good fit for your stack. Would love to talk.

---

## Follow-up Sequence

**Day 3 — Follow-up 1:**
"Hey [name], just wanted to bump this up. We've had a few other robotics companies reach out after seeing some of our technical demos, but wanted to give you first shot since the architecture fit is the strongest. Let me know if you've got time this week."

**Day 7 — Follow-up 2:**
"Saw this and thought of you: [link to relevant article about competitor locking into proprietary AI, or EU AI Act news, or hardware commoditization trend]. The companies that actually own their AI runtime are going to have a real edge here. Happy to walk you through how we're approaching it if you've got 15 min."

**Day 14 — Break-up:**
"Hey [name], totally get it if the timing's off. We're locking in our launch partner for [their vertical] by end of Q2, so we'll probably be moving forward with someone else soon. But if on-device agent intelligence ends up on your roadmap later this year, door's always open. Good luck with [their milestone]."

---

## The Core Argument: Why Hive > Any Static LLM

Use this framing in calls and follow-ups when prospects push back with "why not just use GPT/Gemini/Qwen?"

**The structural argument:**

Every major LLM today — GPT, Gemini, Qwen, Llama — is trained on static data. It's a snapshot of the internet at a point in time. Once deployed on a robot, it cannot learn from what the robot actually experiences. It's frozen intelligence.

The Hive is the opposite. It's continually grounded in real-world, native multimodal action streams — what the robot sees, hears, touches, and does. Every interaction is learning. Every deployment environment adds data. The intelligence isn't static — it evolves with every node.

Now imagine a million agents across every topology — hierarchical, mesh, swarm, federated — all working toward a common cause, each contributing real-world grounded data back to the Hive. A million coding agents evolving the software layer itself, democratically, not controlled by one company's research team.

As the software layer commoditizes (and it will — every robotics company will have access to the same foundation models), the differentiator becomes:

1. **Grounded intelligence** — AI that learned from YOUR robots in YOUR environments, not generic internet text
2. **Compounding network effects** — more nodes = smarter Hive, not just more API calls
3. **Democratic evolution** — the collective decides how the intelligence evolves, not one company's board
4. **Agent topology diversity** — hierarchical for command chains, mesh for peer collaboration, swarm for emergent behavior, federated for privacy — all native

No static LLM can match a Hive of a million continually grounded agents. That's the pitch.

---

## Why This Approach

| Element | Based On |
|---------|----------|
| Opening | Name competitors who locked into Big Tech AI — creates contrast |
| Hook | "Own your AI future vs. rent it" — governance story, not just tech |
| FOMO | One partner per vertical, Q2 deadline, flywheel favors early movers |
| Proof | Hive flywheel + HARTOS technical specifics (3-tier routing, sub-10ms, memory graph) |
| Differentiator | Democratic evolution + continual grounding vs. static LLMs |
| CTA | Low-friction: 20-min call, "first choice" framing |
| Tone | Technical peer with conviction. Founder-to-founder or founder-to-CTO |
| Exclusions | No prospects with existing LLM vendor partnerships to avoid positioning as a competitor |

---

## Prospect Comparison Matrix

| Company | Location | Robot | Open SDK? | LLM Lock-in? | Privacy Need? | Best HARTOS Angle |
|---------|----------|-------|-----------|---------------|---------------|-------------------|
| Fourier Intelligence | Shanghai | GR-2 humanoid | Yes (ROS) | No | Medium | Developer agent runtime |
| Enchanted Tools | Paris | Mirokai social | Partial | No (multi-LLM) | Very High | Healthcare privacy |
| NEURA Robotics | Germany | 4S humanoid | Yes (Neuraverse) | No | Medium | Sim-to-real bridge |
| Standard Bots | New York | RO1 cobot | Yes | No | High (factory) | Memory + reasoning layer |
| Collaborative Robotics | Santa Clara | Proxie | Unknown | No | Medium | Per-site adaptation |
| Sanctuary AI | Vancouver | Phoenix | No (Carbon) | Partial | Medium | On-device execution layer |
