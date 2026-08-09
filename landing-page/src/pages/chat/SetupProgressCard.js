import { Box, IconButton, Typography, LinearProgress, Fade, Button, Stack, Tooltip } from '@mui/material';
import { X as CloseIcon } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import RelativeTime, { useRelativeTick } from '../../components/Common/RelativeTime';

/**
 * SetupProgressCard — dreamy progress card for long-running setup jobs
 * (TTS engine install, model downloads, etc.)
 *
 * Matches the onboarding "Light your HART" visual language:
 * - Dark glass surface with subtle gradient border
 * - Animated progress bar with purple accent
 * - Step-by-step log with fade-in animation
 *
 * The "Ready" banner is ONLY shown when the backend also passes the
 * first-run TTS handshake (audio bytes + audible duration produced
 * by real synth).  A bare isComplete=true without a verified
 * handshake shows "Verifying voice..." rather than the green banner.
 * See tts/tts_handshake.py for the gating contract.
 *
 * Props:
 *   steps: Array<{step, message, timestamp}>  — progress steps received via SSE
 *   jobType: string — e.g. 'tts_setup_chatterbox_turbo'
 *   isComplete: boolean — true when job finishes
 *   handshake: {
 *     status: 'ready'|'failed'|'pending',
 *     engine: string, lang: string,
 *     err?: string, fallbacks?: string[],
 *   }  — verified voice-check outcome from tts_handshake SSE.
 *        Defaults to {status:'pending'}; banner stays yellow until
 *        this flips to 'ready' or 'failed'.
 *   onRetry?: () => void         — user clicked Retry on failed handshake
 *   onSwitchEngine?: (engine: string) => void — user picked a fallback
 *   onDismiss?: () => void       — user clicked the soft-dismiss × button.
 *                                  Caller should mark the underlying chat
 *                                  message as dismissed (soft-delete) rather
 *                                  than removing it — the history is kept,
 *                                  the bubble just stops rendering.  The
 *                                  dismiss control only appears once the
 *                                  setup has reached a terminal state
 *                                  (handshake ready/failed OR install
 *                                  failure) — we don't allow dismissing a
 *                                  card that's still actively loading,
 *                                  because that would orphan the running
 *                                  job from any user-visible signal.
 */

const JOB_LABELS = {
  tts_setup_chatterbox_turbo: 'Chatterbox Turbo',
  tts_setup_chatterbox_multilingual: 'Chatterbox Multilingual',
  tts_setup_indic_parler: 'Indic Parler TTS',
  tts_setup_cosyvoice3: 'CosyVoice3',
  tts_setup_f5: 'F5-TTS',
  tts_setup_piper: 'Piper TTS',
  // Non-TTS setup job (STT + LLM + model downloads) surfaced through the same
  // card by the /api/ai/bootstrap poll — give it a human label.
  bootstrap: 'AI models',
};

const ACCENT = '#6C63FF';
const SURFACE_BG = 'rgba(15, 14, 23, 0.85)';
const BORDER_GRADIENT = 'linear-gradient(135deg, rgba(108,99,255,0.4), rgba(255,107,107,0.2))';

/**
 * How long a card may sit in a TERMINAL state before it stops reading as live
 * status.  Exported so tests bound the behaviour against the same number the
 * component uses, rather than a copy that can drift.
 *
 * Chosen against the failure it prevents, not as a round number: the ambiguity
 * only starts costing anything once a reader could mistake an old verdict for
 * the current one, and a terminal card has by definition stopped changing.  It
 * deliberately does NOT need to accommodate long installs — see the isStale
 * gate below, which excludes them entirely.
 */
export const STALE_AFTER_MS = 5 * 60_000;

export default function SetupProgressCard({
  steps = [],
  jobType = '',
  isComplete = false,
  handshake = { status: 'pending' },
  onRetry,
  onSwitchEngine,
  onDismiss,
  firstSeen = null,
  lastActivity = null,
}) {
  const [showComplete, setShowComplete] = useState(false);
  const scrollRef = useRef(null);

  const label = JOB_LABELS[jobType] || jobType.replace(/^tts_setup_/, '').replace(/_/g, ' ');
  const latestStep = steps[steps.length - 1];
  const installFailed = steps.some(s => s.message?.includes('failed') || s.message?.includes('error'));
  // Authoritative banner state. "Ready" is ONLY reached via a
  // verified handshake — install-complete alone keeps us yellow.
  const handshakeReady = handshake?.status === 'ready';
  const handshakeFailed = handshake?.status === 'failed';
  // TTS engine installs earn "Ready" only via a verified voice handshake.
  // Everything else routed through this card (the `bootstrap` job: STT / LLM /
  // model downloads) has NO handshake, so its install-complete IS terminal.
  // Without this the bootstrap card never reached a terminal state — it
  // lingered on "Setting up…" with no dismiss control, while TTS cards got ✕.
  const expectsHandshake = jobType.startsWith('tts_setup_');
  const isReady = handshakeReady || (!expectsHandshake && isComplete && !installFailed);
  const isFailed = installFailed || handshakeFailed;

  // STALENESS.  A finished card that has sat around for a while must stop
  // reading as live status — a "chatterbox-turbo Failed" panel looked exactly
  // like current state while an unrelated pip install ran underneath it, which
  // cost real debugging time.
  //
  // The gate is TERMINAL-ONLY, and that is the load-bearing part: model
  // downloads and TTS installs legitimately run for many minutes, so an
  // age-only rule would grey out every long install mid-flight and make a
  // working job look broken.  A card is stale only once it has stopped
  // changing AND that last change is old.
  //
  // lastActivity falls back to firstSeen because cards restored from history
  // carry `timestamp` but no `updatedAt`; without the fallback an old restored
  // card would never demote.  Ticking on the shared cadence means the verdict
  // advances on its own instead of waiting for an unrelated re-render.
  const staleAnchor = lastActivity || firstSeen;
  useRelativeTick(staleAnchor);
  const isTerminal = isReady || isFailed;
  const isStale = Boolean(
    isTerminal && staleAnchor
      && (Date.now() - new Date(staleAnchor).getTime()) > STALE_AFTER_MS
  );
  // Estimate progress: most installs have 6-10 steps
  const estimatedTotal = 8;
  const progressPercent = isReady
    ? 100
    : Math.min(95, (steps.length / estimatedTotal) * 100);

  useEffect(() => {
    // Delay the completion message until we have a definite verdict —
    // isComplete alone is a proxy signal; only the handshake (TTS) or a hard
    // install failure is terminal.  For non-TTS cards (bootstrap) install-
    // complete IS that verdict (folded into isReady).
    if (isReady || handshakeFailed || installFailed) {
      const timer = setTimeout(() => setShowComplete(true), 300);
      return () => clearTimeout(timer);
    }
    setShowComplete(false);
    return undefined;
  }, [isReady, handshakeFailed, installFailed]);

  // B4: done/ready cards shouldn't linger.  Once a card reaches a SUCCESSFUL
  // terminal state, auto-collapse it (soft-dismiss via the caller's onDismiss)
  // after a short grace period so the chat returns to the conversation.  Failed
  // cards stay — they carry Retry / Switch-engine actions.  Read onDismiss via
  // a ref so the parent re-rendering the message list on every SSE token can't
  // keep resetting the timer.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  useEffect(() => {
    if (!isReady) return undefined;
    const t = setTimeout(() => {
      if (typeof onDismissRef.current === 'function') onDismissRef.current();
    }, 4000);
    return () => clearTimeout(t);
  }, [isReady]);

  // Auto-scroll to latest step
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps.length]);

  return (
    <Box
      data-testid="setup-progress-card"
      data-stale={isStale ? 'true' : 'false'}
      aria-disabled={isStale ? 'true' : undefined}
      sx={{
      position: 'relative',
      maxWidth: 480,
      borderRadius: '16px',
      overflow: 'hidden',
      my: 1.5,
      // Demote, don't hide: the record stays readable (and Retry stays
      // reachable) but it visibly stops competing with live status.
      opacity: isStale ? 0.55 : 1,
      filter: isStale ? 'saturate(0.4)' : 'none',
      transition: 'opacity 0.4s ease, filter 0.4s ease',
      // Glass border effect
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        borderRadius: '16px',
        padding: '1px',
        background: BORDER_GRADIENT,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      },
    }}>
      <Box sx={{
        background: SURFACE_BG,
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        p: 2,
      }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%',
            background: isReady
              ? '#2ECC71'
              : (isFailed ? '#E74C3C' : ACCENT),
            // Keep pulsing until we have a terminal verdict — verified-ready
            // (TTS), install-complete (bootstrap), or a confirmed failure.
            animation: (isReady || isFailed) ? 'none' : 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.4 },
            },
          }} />
          <Typography variant="subtitle2" sx={{
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.85rem',
            letterSpacing: '0.02em',
            flex: 1,
          }}>
            {isReady
              ? `${label} Ready`
              : isFailed
                ? `${label} Failed`
                : (expectsHandshake && isComplete)
                  ? `Verifying ${label} voice...`
                  : `Setting up ${label}...`}
          </Typography>
          {/* WHEN this card first appeared — same field and same renderer as a
              chat bubble (message.timestamp -> RelativeTime), so the card reads
              on the same clock as the conversation around it.  Deliberately
              FIRST appearance, not latest activity: the question a reader has
              is "is this telling me about now, or about earlier?". */}
          {firstSeen && (
            <RelativeTime
              ts={firstSeen}
              data-testid="setup-first-seen"
              style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.45)',
                whiteSpace: 'nowrap',
                marginLeft: 4,
              }}
            />
          )}
          {/* Soft-dismiss × — only once the card has a terminal
              verdict. Calling onDismiss is the caller's signal to mark
              the message as dismissed in chat state (soft-delete: the
              record stays, the bubble just stops rendering). */}
          {typeof onDismiss === 'function' && (isReady || isFailed) && (
            <Tooltip title="Dismiss" placement="left" arrow>
              <IconButton
                size="small"
                aria-label="Dismiss setup card"
                onClick={onDismiss}
                sx={{
                  color: 'rgba(255,255,255,0.5)',
                  p: 0.25,
                  '&:hover': {
                    color: 'rgba(255,255,255,0.95)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                }}
              >
                <CloseIcon size={14} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{
            height: 4,
            borderRadius: 2,
            mb: 1.5,
            backgroundColor: 'rgba(108,99,255,0.15)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 2,
              background: handshakeReady
                ? 'linear-gradient(90deg, #2ECC71, #27AE60)'
                : `linear-gradient(90deg, ${ACCENT}, #9B59B6)`,
              transition: 'transform 0.6s ease',
            },
          }}
        />

        {/* Step log */}
        <Box ref={scrollRef} sx={{
          maxHeight: 140,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 3 },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(108,99,255,0.3)',
            borderRadius: 2,
          },
        }}>
          {steps.map((step, i) => (
            <Fade in key={step.timestamp || i} timeout={400}>
              <Typography sx={{
                color: i === steps.length - 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                fontSize: '0.75rem',
                lineHeight: 1.6,
                fontFamily: 'monospace',
                pl: 1.5,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 4, height: 4,
                  borderRadius: '50%',
                  background: i === steps.length - 1 ? ACCENT : 'rgba(255,255,255,0.2)',
                },
              }}>
                {step.message}
              </Typography>
            </Fade>
          ))}
        </Box>

        {/* Stale marker.  Says the quiet part out loud so the card cannot be
            read as current status.  Not gated on showComplete: a card can be
            restored from history already stale, having never animated. */}
        {isStale && (
          <Typography
            data-testid="setup-stale-note"
            sx={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.7rem',
              fontStyle: 'italic',
              mt: 1,
              textAlign: 'center',
            }}
          >
            No longer current — this finished earlier
          </Typography>
        )}

        {/* Completion message */}
        {showComplete && (
          <Fade in timeout={600}>
            <Box>
              <Typography sx={{
                color: isReady
                  ? '#2ECC71'
                  : '#E74C3C',
                fontSize: '0.8rem',
                fontWeight: 500,
                mt: 1,
                textAlign: 'center',
              }}>
                {isReady
                  ? (expectsHandshake
                      ? `Voice engine ready — next message will use ${label}`
                      : `${label} ready`)
                  : handshakeFailed
                    // Surface the ACTUAL engine error rather than a
                    // green lie.  Truncated so the banner stays small.
                    ? `Voice check failed — ${label}: ${(handshake?.err || 'no audio produced').slice(0, 120)}`
                    : (expectsHandshake
                        ? `${label} unavailable — using fallback voice engine`
                        : `${label} setup incomplete`)}
              </Typography>

              {/* Retry / Switch engine buttons on handshake failure. */}
              {handshakeFailed && (
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                  {typeof onRetry === 'function' && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={onRetry}
                      sx={{
                        color: '#fff',
                        borderColor: 'rgba(255,255,255,0.3)',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                      }}
                    >
                      Retry
                    </Button>
                  )}
                  {typeof onSwitchEngine === 'function'
                    && Array.isArray(handshake?.fallbacks)
                    && handshake.fallbacks.slice(0, 2).map((fb) => (
                    <Button
                      key={fb}
                      size="small"
                      variant="outlined"
                      onClick={() => onSwitchEngine(fb)}
                      sx={{
                        color: '#fff',
                        borderColor: ACCENT,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                      }}
                    >
                      Use {fb}
                    </Button>
                  ))}
                </Stack>
              )}
            </Box>
          </Fade>
        )}
      </Box>
    </Box>
  );
}
