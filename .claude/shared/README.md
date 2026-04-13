# Shared workspace for agent-to-agent collaboration

Files in this directory are append-only history shared across all specialist agents. See `.claude/agents/master-orchestrator.md` for the protocol.

## Files

- **test-failures.md** — testing agent appends every failure (manual or automated) with reproduction steps, expected vs observed, and back-reference to the orchestrator expectation it breaks
- **orchestrator-expectations.md** — orchestrator writes what SHOULD happen for each change before dispatching testing
- **agent-findings.md** — every agent appends a one-block summary of their findings so later agents can read prior context
- **open-questions.md** — questions from one agent to another ("architect: why is this function inlined instead of imported?")
- **disputes.md** — recorded specialist-to-specialist disputes and how they were resolved (audit trail)
- **runtime-observations.md** — runtime-log-watcher appends log-derived facts that other agents use to verify expectations

