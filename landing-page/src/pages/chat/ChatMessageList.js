/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import TypeWriterForSubtitle from './TypeWriterSubtitle';

import hourglassAnimation from '../../assets/hourglass-lottie.json';

import Lottie from 'lottie-react';
import {FileText} from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import React, {useState, useEffect, useRef} from 'react';

import {formatTier} from '../../utils/tier';

// Markdown renderer for assistant replies — the model emits standard
// Markdown (**bold**, _italic_, lists, code fences, links).  Without
// this, the bubble shows literal asterisks and underscores instead
// of formatted text.  ``markdown-to-jsx`` is already in the bundle
// (``pages/blogs/Markdown.js``) and sanitizes by default — no
// new dependency, no XSS risk from raw HTML.  ``forceBlock`` keeps
// paragraph wrapping consistent with the prior ``<div>`` layout so
// the bubble height doesn't visually shift.
const ASSISTANT_MD_OPTS = {
  forceBlock: true,
  overrides: {
    a: {
      props: {
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'underline',
      },
    },
    code: {props: {className: 'px-1 py-0.5 rounded bg-white/10 text-xs'}},
    pre: {props: {className: 'p-2 my-2 rounded bg-black/20 overflow-x-auto text-xs'}},
    ul: {props: {className: 'list-disc pl-5 my-2 space-y-1'}},
    ol: {props: {className: 'list-decimal pl-5 my-2 space-y-1'}},
    h1: {props: {className: 'text-base font-semibold mt-2 mb-1'}},
    h2: {props: {className: 'text-sm font-semibold mt-2 mb-1'}},
    h3: {props: {className: 'text-sm font-semibold mt-2 mb-1'}},
  },
};



// Timestamp format — ported from Hevolve.ai ConversationHistoryPanel.js
function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
}
import ThinkingProcessContainer from './ThinkingProcessContainer';
import WorkflowFlowchart from './WorkflowFlowchart';
import SetupProgressCard from './SetupProgressCard';

const THINKING_VERBS = [
  'Analyzing',
  'Understanding',
  'Reasoning',
  'Composing',
  'Evaluating',
  'Exploring',
  'Connecting',
  'Synthesizing',
  'Reflecting',
  'Processing',
  'Interpreting',
  'Considering',
];

// Hevolve brand palette — sampled from the in-app Lottie animations
// (hourglass-lottie.json #0197F7 + #FF0000) plus the secondary trio
// (#00E89D / #6C63FF) already used across pricing CTAs and Demopage
// accents.  Combined as a 3-stop cycle (skipping the bright red, which
// is too jarring for inline body text) so the gradient drifts smoothly
// across the visible characters without strobing.
const HEVOLVE_GRADIENT = 'linear-gradient(90deg, #0197F7 0%, #00E89D 33%, #6C63FF 66%, #0197F7 100%)';

/** Cycles through generic verbs unless overrideText (server-emitted stage)
 * is provided.  When server has real status text ("Searching your message
 * history…", "Preparing tools…"), use it directly and stop cycling.
 *
 * Colour treatment:
 *   - Text is rendered with the Hevolve gradient as `background-clip: text`.
 *     The gradient slowly drifts (background-position animation) so even
 *     idle "Analyzing..." text breathes between the brand colours.
 *   - On every fresh text change a `key` remount restarts both:
 *       1. The drift animation (gradient sweep) — sharp restart, no jump.
 *       2. A brief 600ms "highlight" overlay that boosts saturation, then
 *          fades back to the steady-state gradient.
 *     The combination produces a "light up on new word" feel without
 *     being epileptic on rapid trace bursts.
 */
function CyclingVerb({overrideText}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (overrideText) return;
    const id = setInterval(
      () => setIdx((i) => (i + 1) % THINKING_VERBS.length),
      2000
    );
    return () => clearInterval(id);
  }, [overrideText]);
  const text = overrideText || `${THINKING_VERBS[idx]}...`;
  return (
    <span
      key={text}
      className="inline-block text-xs font-medium truncate max-w-[60vw]"
      style={{
        backgroundImage: HEVOLVE_GRADIENT,
        backgroundSize: '300% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        // Two animations layered: gradient drift (steady) +
        // verbFadeSwap (existing vertical fade-in on remount).
        // hevolveTextDrift runs at 6s linear infinite so the colour
        // story is calm; verbFadeSwap is the per-change pulse.
        animation:
          'hevolveTextDrift 6s linear infinite, verbFadeSwap 600ms ease-out',
        // Smooth interpolation back to steady when the next text
        // arrives — covers any transient style mismatch.
        transition: 'filter 400ms ease, opacity 400ms ease',
        filter: 'saturate(1.2)',
      }}
    >
      {text}
    </span>
  );
}

/** Elapsed-time counter that ticks every 1s while active.  Format scales:
 * "5s" → "42s" → "1m 12s" → "1h 5m 30s".  Resets cleanly on next request. */
function ElapsedTimer({active}) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (active) {
      startRef.current = Date.now();
      setElapsed(0);
      const id = setInterval(
        () => setElapsed(Date.now() - startRef.current),
        1000
      );
      return () => clearInterval(id);
    }
    startRef.current = null;
  }, [active]);
  if (!active) return null;
  const s = Math.floor(elapsed / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const txt = h > 0
    ? `${h}h ${m % 60}m`
    : m > 0
    ? `${m}m ${s % 60}s`
    : `${s}s`;
  return (
    <span className="ml-auto text-xs text-gray-400 font-mono">⏱ {txt}</span>
  );
}

/**
 * ChatMessageList renders the scrollable list of chat messages.
 *
 * Extracted from Demopage.js to keep the main component focused on
 * orchestration logic rather than presentation.
 *
 * Props:
 *  - messages           Array of message objects
 *  - setMessages        State setter (needed for thinking-container toggles)
 *  - isRequestInFlight  Whether an HTTP request is currently pending
 *  - currentThinkingId  ID of the active thinking process (hides loading dots)
 *  - animatingMessageIndex  Index of the message currently animating (typewriter)
 *  - duration           Duration for the typewriter animation
 *  - isTextMode         Whether the chat is in text-only mode (no avatar video)
 *  - videoUrl           Current video URL (used for idle detection)
 *  - idleVideoUrl       The idle-loop video URL
 *  - progress           PDF upload progress percentage
 *  - messagesEndRef     Ref attached to the scroll-anchor div
 *  - onPdfClick         Callback when user clicks "View Uploaded PDF"
 *  - onImageClick       Callback when user clicks an uploaded image thumbnail
 *  - onImgError         Callback for broken image fallback
 *  - onRetryMessage     Callback to retry a failed message
 *  - onDeleteMessage    Callback to delete/cancel a message
 *  - setCodeContent     Callback to display code in the code viewer
 */
const ChatMessageList = ({
  messages,
  setMessages,
  isRequestInFlight,
  currentThinkingId,
  animatingMessageIndex,
  duration,
  isTextMode,
  videoUrl,
  idleVideoUrl,
  progress,
  messagesEndRef,
  onPdfClick,
  onImageClick,
  onImgError,
  onRetryMessage,
  onDeleteMessage,
  setCodeContent,
  onExecutePlan,
  onSetupLlm,
  onConfigureLlm,
  // #508 — server-emitted dynamic stage text (latest priority=49 'Thinking'
  // event text, ~6 words).  Substituted into the CyclingVerb spinner so
  // the user sees real status ("Searching your message history…") instead
  // of generic cycling verbs.  Empty/undefined falls back to the cycle.
  latestThinkingText,
  // #508 — when false, hide the collapsible <ThinkingProcessContainer>
  // entirely (the spinner row's CyclingVerb is the sole status surface).
  // Default true preserves today's UX.
  showThinkingTraces = true,
}) => {
  const isIdleVideo = (url) => url === idleVideoUrl;

  return (
    <div className="w-full px-3 py-4 space-y-6" role="log" aria-live="polite" aria-label="Chat messages">
      {messages.map((message, index) => {
        if (message.type === 'thinking_container') {
          if (!showThinkingTraces) return null;  // #508 — toggle OFF: hide collapsible
          return (
            <ThinkingProcessContainer
              key={`thinking-container-${message.id}-${index}`}
              thinkingMessages={message.thinkingSteps}
              isMainExpanded={message.isMainExpanded}
              isContainerCompleted={message.isCompleted}
              hideTimer={isRequestInFlight}  // #508 — hourglass row owns the live timer while in-flight
              onToggleMain={() => {
                setMessages((prev) =>
                  prev.map((msg, msgIndex) =>
                    msgIndex === index
                      ? {
                          ...msg,
                          isMainExpanded: !msg.isMainExpanded,
                        }
                      : msg
                  )
                );
              }}
              onToggleIndividual={(stepId) => {
                setMessages((prev) =>
                  prev.map((msg, msgIndex) =>
                    msgIndex === index
                      ? {
                          ...msg,
                          thinkingSteps: msg.thinkingSteps.map((step) =>
                            step.id === stepId
                              ? {
                                  ...step,
                                  isExpanded: !step.isExpanded,
                                }
                              : step
                          ),
                        }
                      : msg
                  )
                );
              }}
            />
          );
        }

        if (message.type === 'workflow_flowchart' && message.recipe) {
          return (
            <WorkflowFlowchart
              key={`flowchart-${message.promptId || index}`}
              recipe={message.recipe}
            />
          );
        }

        if (message.type === 'setup_progress') {
          // Soft-delete: a dismissed card stays in the messages array
          // (so chat-sync replicas, history, and any future "undo"
          // affordance still see the record) but renders nothing.  We
          // checked once here rather than inside SetupProgressCard so
          // the dismissed bubble doesn't claim layout space + key
          // collisions stay impossible.
          if (message.dismissed) {
            return null;
          }
          // Retry / Switch-engine handlers POST to the TTS handshake
          // API; success fires a fresh tts_handshake SSE which the
          // Demopage listener grafts back onto this card by engine.
          const handleRetry = async () => {
            try {
              await fetch('/api/tts/handshake/retry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  engine: message.handshake?.engine,
                  lang: message.handshake?.lang,
                }),
              });
            } catch (e) {
              console.warn('[handshake] retry failed', e);
            }
          };
          const handleSwitchEngine = async (engine) => {
            try {
              await fetch('/api/tts/handshake/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  engine,
                  lang: message.handshake?.lang,
                }),
              });
            } catch (e) {
              console.warn('[handshake] switch failed', e);
            }
          };
          // Soft-dismiss: flip ``dismissed:true`` on this message in
          // place so the next render skips it.  The setup_progress
          // SSE listener in Demopage looks the message up by jobType,
          // so a dismissed record can still be re-located if a fresh
          // event arrives — the user can resurrect the card by
          // triggering another setup run.
          const handleDismiss = () => {
            setMessages((prev) => prev.map((m, i) => (
              i === index ? { ...m, dismissed: true } : m
            )));
          };
          return (
            <SetupProgressCard
              key={`setup-${message.jobType || index}`}
              steps={message.steps || []}
              jobType={message.jobType || ''}
              isComplete={message.isComplete || false}
              handshake={message.handshake || { status: 'pending' }}
              onRetry={handleRetry}
              onSwitchEngine={handleSwitchEngine}
              onDismiss={handleDismiss}
            />
          );
        }

        if (message.type === 'llm_setup_card' && message.setupCard) {
          const card = message.setupCard;
          const sizeMb = card.size_mb;
          const sizeLabel =
            sizeMb >= 1024
              ? `${(sizeMb / 1024).toFixed(1)} GB`
              : `${sizeMb} MB`;
          return (
            <div
              key={`llm-setup-${index}`}
              className="rounded-lg p-6 shadow-sm animate-slide-in-left"
              style={{
                maxWidth: '100%',
                backgroundColor: '#1a2332',
                color: '#FFFFFF',
                border: '1px solid #6C63FF',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  style={{
                    color: '#6C63FF',
                    fontWeight: 'bold',
                    fontSize: '1.1em',
                  }}
                >
                  Local LLM Setup
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      card.gpu_mode === 'GPU' ? '#4CAF5033' : '#FF980033',
                    color: card.gpu_mode === 'GPU' ? '#4CAF50' : '#FF9800',
                  }}
                >
                  {card.gpu_mode}
                </span>
              </div>
              {message.content && (
                <p className="text-sm text-gray-300 mb-3">{message.content}</p>
              )}
              <div className="text-sm space-y-1 mb-4" style={{color: '#ccc'}}>
                <div>
                  <strong>Model:</strong> {card.model_name}
                </div>
                <div>
                  <strong>Size:</strong> {sizeLabel}
                </div>
                <div>
                  <strong>Details:</strong> {card.description}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onSetupLlm?.(card)}
                  disabled={isRequestInFlight}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: isRequestInFlight ? '#4a4a4a' : '#6C63FF',
                    color: '#fff',
                    cursor: isRequestInFlight ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isRequestInFlight ? 'Setting up...' : 'Auto Setup'}
                </button>
                <button
                  onClick={() => onConfigureLlm?.()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#999',
                    border: '1px solid #555',
                    cursor: 'pointer',
                  }}
                >
                  I'll Configure
                </button>
              </div>
            </div>
          );
        }

        if (message.type === 'plan_card' && message.plan) {
          const plan = message.plan;
          return (
            <div
              key={`plan-card-${index}`}
              className="rounded-lg p-6 shadow-sm animate-slide-in-left"
              style={{
                maxWidth: '100%',
                backgroundColor: '#1a2332',
                color: '#FFFFFF',
                border: '1px solid #6C63FF',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  style={{
                    color: '#6C63FF',
                    fontWeight: 'bold',
                    fontSize: '1.1em',
                  }}
                >
                  Proposed Plan
                </span>
                {plan.matched_agent_id && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{backgroundColor: '#6C63FF33', color: '#6C63FF'}}
                  >
                    Agent matched
                  </span>
                )}
                {plan.requires_new_agent && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{backgroundColor: '#FF6B6B33', color: '#FF6B6B'}}
                  >
                    New agent needed
                  </span>
                )}
              </div>
              {message.content && (
                <p className="text-sm text-gray-300 mb-3">{message.content}</p>
              )}
              <ol className="space-y-2 mb-4">
                {(plan.steps || []).map((step) => (
                  <li
                    key={step.step_num}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{backgroundColor: '#6C63FF', color: '#fff'}}
                    >
                      {step.step_num}
                    </span>
                    <span>{step.description}</span>
                  </li>
                ))}
              </ol>
              <div className="flex gap-3">
                <button
                  onClick={() => onExecutePlan?.(plan, message.prompt_id)}
                  disabled={isRequestInFlight}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: isRequestInFlight ? '#4a4a4a' : '#6C63FF',
                    color: '#fff',
                    cursor: isRequestInFlight ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isRequestInFlight ? 'Executing...' : 'Execute Plan'}
                </button>
                <button
                  onClick={() => {
                    // Remove the plan card and let user rephrase
                    setMessages((prev) => prev.filter((_, i) => i !== index));
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#999',
                    border: '1px solid #555',
                    cursor: 'pointer',
                  }}
                >
                  Modify
                </button>
              </div>
            </div>
          );
        }

        return (
          <div key={index}>
            <div
              className={`rounded-lg p-6 shadow-sm overflow-visible ${message.type === 'user' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
              style={{
                maxWidth: '100%',
                backgroundColor:
                  message.type === 'user' ? '#EFEAAA' : '#212A31',
                color: message.type === 'user' ? '#000000' : '#FFFFFF',
                animationDelay: `${Math.min(index * 30, 300)}ms`,
                animationFillMode: 'both',
              }}
            >
              <div className="flex-1 space-y-4">
                <div
                  className={
                    message.type === 'user'
                      ? 'text-black font-bold'
                      : 'text-white'
                  }
                >
                  {message.type === 'user' && (
                    <div className="space-y-2">
                      <div>{message.content}</div>

                      {message.pdf && (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              Understanding the Content: {progress}%
                            </span>
                          </div>

                          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, progress)
                                )}%`,
                              }}
                            />
                          </div>

                          <button
                            onClick={() => onPdfClick(message.pdf)}
                            className="text-blue-600 hover:text-blue-800 underline flex items-center gap-2"
                          >
                            <FileText className="w-5 h-5" />
                            View Uploaded PDF
                          </button>
                        </div>
                      )}

                      {message.image && (
                        <div className="mt-2">
                          <img
                            src={message.image}
                            alt="Uploaded"
                            className="w-16 h-16 rounded-lg shadow-md cursor-pointer"
                            onClick={() => onImageClick(message.image)}
                            onError={onImgError}
                          />
                        </div>
                      )}
                      {/* Timestamp — parity with the assistant bubble below.
                          Same field (message.timestamp), same helper
                          (formatTimestamp).  Demopage backfills this on
                          every send (Demopage.js:1380) so the field is
                          reliably present. */}
                      {message.timestamp && (
                        <div className="text-xs mt-1" style={{ color: 'rgba(0,0,0,0.55)' }}>
                          {formatTimestamp(message.timestamp)}
                        </div>
                      )}
                    </div>
                  )}

                  {message.type === 'assistant' && (
                    <>
                      {isTextMode ? (
                        <div>
                          <Markdown options={ASSISTANT_MD_OPTS}>
                            {message.content || ''}
                          </Markdown>
                        </div>
                      ) : animatingMessageIndex === index && duration > 0 ? (
                        // Typewriter animation needs raw chars — Markdown
                        // post-renders once the typewriter completes via
                        // the next state transition into the static branch.
                        <TypeWriterForSubtitle
                          text={message.content}
                          duration={duration}
                          isIdle={isIdleVideo(videoUrl)}
                        />
                      ) : (
                        <div>
                          <Markdown options={ASSISTANT_MD_OPTS}>
                            {message.content || ''}
                          </Markdown>
                        </div>
                      )}
                      {/* Intelligence source badge + timestamp.
                          servedBy/nodeTier come from /chat response_json
                          (Nunba routes/chatbot_routes.py:2693).  Fall back
                          to message.source so legacy buckets that didn't
                          plumb the new fields still render something. */}
                      {(() => {
                        const tier = formatTier(
                          message.servedBy ||
                            (message.source?.includes('local') ? 'local'
                              : message.source?.includes('cloud') ? 'cloud'
                              : message.source?.includes('hive') ? 'hive'
                              : 'local'),
                          message.nodeTier,
                        );
                        return (
                          <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                            <div
                              className="flex items-center gap-1"
                              title={`${tier.label} · ${tier.sublabel}`}
                            >
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: tier.color }}
                              />
                              <span>{tier.emoji} {tier.label}</span>
                            </div>
                            {message.timestamp && (
                              <span>&middot; {formatTimestamp(message.timestamp)}</span>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {message.type === 'system' && (
                    <div className="text-center text-sm text-gray-400 italic">
                      {message.content}
                    </div>
                  )}
                </div>

                {message.code && (
                  <button
                    onClick={() => setCodeContent(message.code)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-md"
                  >
                    Show Code
                  </button>
                )}
              </div>
            </div>

            {/* Message status — outside bubble */}
            {message.type === 'user' &&
              message.status &&
              message.status !== 'sent' && (
                <div className="mt-1 px-1" style={{maxWidth: '75%'}}>
                  <style>{`
                @keyframes sendDotPulse {
                  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                  40% { opacity: 1; transform: scale(1.2); }
                }
                @keyframes retrySpinner { to { transform: rotate(360deg); } }
              `}</style>

                  {message.status === 'retrying' && (
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{
                        background: 'rgba(234, 179, 8, 0.08)',
                        border: '1px solid rgba(234, 179, 8, 0.15)',
                      }}
                    >
                      <span
                        className="inline-block w-3.5 h-3.5 rounded-full"
                        style={{
                          border: '2px solid #EAB308',
                          borderTopColor: 'transparent',
                          animation: 'retrySpinner 0.8s linear infinite',
                        }}
                      />
                      <span className="text-[11px] text-yellow-400/90 flex-1">
                        {message.error}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMessage(message.messageId);
                        }}
                        className="text-[11px] text-gray-500 hover:text-red-400 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {message.status === 'failed' && (
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        className="text-red-400 flex-shrink-0"
                      >
                        <circle
                          cx="7"
                          cy="7"
                          r="6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                        />
                        <path
                          d="M7 4v3.5M7 9.5v.01"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-[11px] text-red-400/90 flex-1">
                        {message.error}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetryMessage(message.messageId);
                        }}
                        className="text-[11px] font-semibold text-red-300 hover:text-white px-2 py-0.5 rounded-md transition-all"
                        style={{background: 'rgba(239, 68, 68, 0.2)'}}
                      >
                        Retry
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMessage(message.messageId);
                        }}
                        className="text-[11px] text-gray-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
          </div>
        );
      })}

      <ThinkingHourglassRow
        isRequestInFlight={isRequestInFlight}
        latestThinkingText={latestThinkingText}
      />

      <div ref={messagesEndRef} />
    </div>
  );
};

// Compact human-readable formatter for the post-hoc "Thought for X"
// pill.  Sub-second → "Xms", under a minute → "X.Xs", longer → "Xm Ys".
// Keeps the standby pill short enough to sit comfortably on one row.
function formatThoughtMs(ms) {
  if (!ms || ms < 0) return '';
  const s = ms / 1000;
  if (s < 1) return `${Math.round(ms)}ms`;
  if (s < 60) return `${s.toFixed(1)}s`;
  const minutes = Math.floor(s / 60);
  const seconds = Math.round(s % 60);
  return `${minutes}m ${seconds}s`;
}

/** Hourglass row + Claude-Code-style standby pill.
 *
 * In-flight: Lottie + colour-cycling thinking text + ElapsedTimer.
 * Standby (post-request):  no Lottie, no animation — just
 *   "Thought for 4s" pill, matching Claude Code's silent end-state.
 *   Persists until the next request starts, then collapses.
 *
 * Implementation is kept INSIDE ChatMessageList.js so the existing prop
 * surface (isRequestInFlight, latestThinkingText) drives both states
 * without threading new props from Demopage.  The total-elapsed
 * capture is local: we observe the in-flight transition and snapshot
 * the duration on the trailing edge.
 */
function ThinkingHourglassRow({isRequestInFlight, latestThinkingText}) {
  const [lastThoughtMs, setLastThoughtMs] = useState(0);
  const prevInFlightRef = useRef(false);
  const startMsRef = useRef(null);

  useEffect(() => {
    if (isRequestInFlight && !prevInFlightRef.current) {
      // false → true: new request starting, reset the standby pill.
      startMsRef.current = Date.now();
      setLastThoughtMs(0);
    } else if (!isRequestInFlight && prevInFlightRef.current) {
      // true → false: capture the cumulative thinking duration.
      if (startMsRef.current) {
        setLastThoughtMs(Date.now() - startMsRef.current);
        startMsRef.current = null;
      }
    }
    prevInFlightRef.current = isRequestInFlight;
  }, [isRequestInFlight]);

  const showStandby = !isRequestInFlight && lastThoughtMs > 0;

  if (!isRequestInFlight && !showStandby) return null;

  return (
    <div className="flex items-center justify-start gap-2 py-2 px-1">
      <style>{`
        @keyframes verbFadeSwap {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes hevolveTextDrift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes hevolveStandbyFadeIn {
          0%   { opacity: 0; transform: translateY(2px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {isRequestInFlight ? (
        <>
          <Lottie
            animationData={hourglassAnimation}
            loop
            style={{width: 24, height: 24}}
          />
          <CyclingVerb overrideText={latestThinkingText} />
          <ElapsedTimer active={isRequestInFlight} />
        </>
      ) : (
        // Standby pill — Claude Code shape: no animation, just the
        // post-hoc duration in subdued type.  Same row position so the
        // transition from in-flight → standby is a quiet swap rather
        // than a layout jump.
        <span
          className="text-[11px] text-gray-500 font-mono"
          style={{
            animation: 'hevolveStandbyFadeIn 280ms ease-out',
          }}
        >
          ✦ Thought for {formatThoughtMs(lastThoughtMs)}
        </span>
      )}
    </div>
  );
}

export default ChatMessageList;
