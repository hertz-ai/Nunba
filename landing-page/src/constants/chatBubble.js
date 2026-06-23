/**
 * chatBubble.js — canonical chat-bubble wire-contract constants.
 *
 * The `com.hertzai.hevolve.chat.{user_id}` envelope (published by HARTOS
 * core.peer_link.crossbar_publish.publish_thinking_trace) carries `priority`
 * and `action`.  The chat renderer (Demopage.handleDataReceived) keys on these
 * to decide whether a bubble is the model's reasoning (a Thought-process Step)
 * or canned progress (the "analysing…" spinner).  Canonical here so a magic
 * `49` / 'Thinking' / 'Status' is never duplicated across handlers.
 *
 * Cross-language mirror of HARTOS `core/constants.py`
 * (CHAT_BUBBLE_PRIORITY / CHAT_ACTION_THINKING / CHAT_ACTION_STATUS) — the two
 * MUST stay in lockstep; the wire contract is shared.
 */

// Reserved priority for chat-bubble (thinking/status) envelopes.
export const CHAT_BUBBLE_PRIORITY = 49;

// The model's ACTUAL reasoning → rendered as Thought-process Steps (id-49 container).
export const CHAT_ACTION_THINKING = 'Thinking';

// Canned pipeline PROGRESS (stages / routing status) → drives the
// "analysing…" spinner ONLY, never a Step.
export const CHAT_ACTION_STATUS = 'Status';
