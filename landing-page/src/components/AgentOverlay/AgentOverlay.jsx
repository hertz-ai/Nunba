import { API_BASE_URL } from '../../config/apiBase';
import {
  CAMERA_CONSENT_TYPE, CONSENT_ANSWER_TYPES, FINGERPRINT_CAPTION, answerCoversAsk,
  askTitle, askerName, asksForSecret, canDecline, consentAskText, declineLabel,
  declineNote, deviceFingerprint, grantLabel, isPerRequester, secretName,
} from '../../constants/consentAsks';
import { NUNBA_CAMERA_CONSENT } from '../../constants/events';
import { formatMoney } from '../../constants/liquidFragments';
import realtimeService from '../../services/realtimeService';
import { agentFormApi, chatApi, consentApi, notificationsApi } from '../../services/socialApi';
import { HART_GLASS_SURFACE } from '../../theme/hartGlass';


import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InfoIcon from '@mui/icons-material/Info';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Box, Typography, Button, IconButton, LinearProgress, TextField,
  Fade, Grow, Chip, Rating,
} from '@mui/material';
import DOMPurify from 'dompurify';
import { QRCodeSVG } from 'qrcode.react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

const MAX_OVERLAYS = 3;
const AUTO_DISMISS_MS = 15000;
// consent.request: a gate is waiting for the answer (HARTOS
// computer_control_block waits up to 90 s), so the card stays until
// answered instead of vanishing at AUTO_DISMISS_MS.
// qr_pair: a WhatsApp code lives ~20s and HARTOS sends the next one as it
// rotates (replacing this card in place, see handleEvent), so the card stays
// until the phone links or the user closes it.
const PERSIST_TYPES = new Set(['checkout', 'approval', 'form', 'meet_copilot', 'consent.request', 'qr_pair']);

// The card's frosted surface is the ONE HART glass (src/theme/hartGlass,
// mirroring HARTOS theme_service.py's emitted shell values), so an overlay
// card, the floating companion window and the HART OS shell are the same
// design rather than three that drift.  Only `color` is this surface's own:
// these cards are always dark-on-glass.
const GLASS = {
  ...HART_GLASS_SURFACE,
  color: '#fff',
};

// The accent is a CSS variable with the app's violet as its fallback: the app
// never sets --hart-accent, so it renders exactly as before, and the
// <hart-agent> embed sets it from the host's brand tokens.
const ACCENT = 'var(--hart-accent, #6C63FF)';
const ACCENT_HOVER = 'var(--hart-accent-strong, #5A52E0)';
const INFO_BLUE = '#64C8FF';
const SUCCESS = '#2ECC71';
const ERROR_RED = '#FF6B6B';

let _overlayIdCounter = 0;

const isIsoCurrency = (c) => typeof c === 'string' && /^[A-Z]{3}$/.test(c);
// An ISO code (INR) is formatted (₹1,240); a bare amount keeps the shape it
// always had.
const showMoney = (v, cur) => (isIsoCurrency(cur) ? formatMoney(v, cur) : v);

// Runs an `onAction` (the embed's host-bridge callback) and keeps the button
// state: idle -> busy -> done | error.  `onAction` resolves {ok, error?,
// fieldErrors?}; a rejected promise counts as an error.
function useActionRunner(onAction) {
  const [state, setState] = useState({ phase: 'idle', error: null });
  const run = useCallback(async (kind, payload) => {
    if (!onAction) return null;
    setState({ phase: 'busy', error: null });
    let res;
    try {
      res = await onAction(kind, payload);
    } catch (e) {
      res = { ok: false, error: (e && e.message) || 'Something went wrong' };
    }
    const ok = !res || res.ok !== false;
    setState({ phase: ok ? 'done' : 'error', error: ok ? null : (res.error || 'Something went wrong') });
    return res || { ok: true };
  }, [onAction]);
  return [state, run];
}

function ActionError({ state }) {
  if (state.phase !== 'error' || !state.error) return null;
  return (
    <Typography role="alert" variant="caption" sx={{ color: ERROR_RED, display: 'block', mt: 0.75 }}>
      {state.error}
    </Typography>
  );
}

// ─── Type-specific renderers ─────────────────────────────────────────

function NotificationCard({ data, navigate, onDismiss }) {
  const colors = { info: INFO_BLUE, success: SUCCESS, error: ERROR_RED, warning: '#F39C12' };
  const accent = colors[data.severity] || INFO_BLUE;
  // HARTOS COMPONENT_TYPES declares `actions` as a prop of
  // 'notification' (liquid_ui_service.py:50).  Honor that contract:
  // render each action as a button.  `kind: 'navigate'` invokes the
  // same `navigate(target)` path AgentOverlay uses for the top-level
  // 'navigate' component type — single canonical navigation primitive,
  // no parallel path.  Unknown action kinds fall back to a console
  // log so they're surfaceable without breaking render.
  const actions = Array.isArray(data.actions) ? data.actions : [];
  return (
    <Box>
      <Box sx={{ width: 4, height: '100%', position: 'absolute', left: 0, top: 0, borderRadius: '16px 0 0 16px', background: accent }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{data.title || 'Notification'}</Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-line' }}>{data.message || data.content}</Typography>
      {actions.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          {actions.map((action, i) => {
            const label = typeof action === 'string' ? action : action.label;
            const kind = typeof action === 'object' ? action.kind : null;
            const target = typeof action === 'object' ? action.target : null;
            return (
              <Button
                key={i}
                size="small"
                variant={i === 0 ? 'contained' : 'outlined'}
                onClick={() => {
                  if (kind === 'navigate' && navigate && target) {
                    navigate(target);
                    if (onDismiss) onDismiss();
                  } else if (kind === 'external' && target) {
                    // OAuth / external sign-in flows: open in a new tab
                    // with security-correct rel attributes.  Same
                    // pattern as ProductCardOverlay.buy_action.
                    window.open(target, '_blank', 'noopener,noreferrer');
                    if (onDismiss) onDismiss();
                  } else {
                    // Surface unhandled action so it's not silently
                    // swallowed — better than no feedback.
                    // eslint-disable-next-line no-console
                    console.warn('NotificationCard: unhandled action', action);
                  }
                }}
                sx={{
                  fontSize: '0.7rem',
                  textTransform: 'none',
                  background: i === 0 ? accent : 'transparent',
                  borderColor: accent,
                  color: i === 0 ? '#fff' : accent,
                  '&:hover': { background: i === 0 ? accent : 'rgba(255,255,255,0.05)' },
                }}
              >
                {label}
              </Button>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function ProductCardOverlay({ data, onAction }) {
  const [act, run] = useActionRunner(onAction);
  // HARTOS COMPONENT_TYPES names the prop `image`; older pushes used
  // `image_url`.  Either renders.
  const image = data.image || data.image_url;
  const addLabel = { idle: 'Add to cart', busy: 'Adding…', done: 'Added ✓ · Add another', error: 'Try again' }[act.phase];
  return (
    <Box>
      {image && (
        <Box component="img" src={image} alt={data.name}
          sx={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: '8px', mb: 1 }} />
      )}
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{data.name}</Typography>
      {data.description && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 0.5 }}>
          {data.description}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        {data.price != null && <Typography sx={{ fontWeight: 700, color: ACCENT }}>{isIsoCurrency(data.currency) ? formatMoney(data.price, data.currency) : `${data.currency || '$'}${data.price}`}</Typography>}
        {data.rating != null && <Rating value={data.rating} precision={0.5} size="small" readOnly />}
      </Box>
      {data.buy_action && onAction && (
        <>
          <Button variant="contained" size="small" fullWidth disabled={act.phase === 'busy'}
            aria-label={`${addLabel}: ${data.name}`}
            sx={{ mt: 1, minHeight: 44, background: ACCENT, '&:hover': { background: ACCENT_HOVER } }}
            onClick={() => run('cart.add', {
              sku: data.sku, product_id: data.product_id, category_id: data.category_id,
              name: data.name, price: data.price, currency: data.currency, qty: 1,
            })}>
            {addLabel}
          </Button>
          <ActionError state={act} />
        </>
      )}
      {data.buy_action && !onAction && (
        <Button variant="contained" size="small" fullWidth
          sx={{ mt: 1, background: ACCENT, '&:hover': { background: ACCENT_HOVER } }}
          onClick={() => window.open(data.buy_action, '_blank')}>
          Buy
        </Button>
      )}
    </Box>
  );
}

function CartOverlay({ data, onAction }) {
  const [act, run] = useActionRunner(onAction);
  const items = data.items || [];
  // Embed: a newer cart (or a placed order) replaced this snapshot.
  const stale = !!(onAction && data.superseded);
  return (
    <Box sx={stale ? { opacity: 0.62 } : undefined}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ShoppingCartIcon sx={{ fontSize: 20, color: ACCENT }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Cart</Typography>
      </Box>
      {onAction && items.length === 0 && (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>Your cart is empty.</Typography>
      )}
      {items.map((item, i) => (
        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.3 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', minWidth: 0, overflowWrap: 'anywhere' }}>
            {item.qty ? `${item.qty} × ` : ''}{item.name}
          </Typography>
          <Typography variant="body2" sx={{ color: ACCENT, whiteSpace: 'nowrap' }}>{typeof item.price === 'number' ? showMoney(item.price, data.currency) : item.price}</Typography>
        </Box>
      ))}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mt: 1, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Total</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: ACCENT }}>{showMoney(data.total, data.currency)}</Typography>
      </Box>
      {stale && (
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255,255,255,0.85)' }}>
          {data.ordered ? 'Ordered ✓' : 'Updated — see the latest cart below'}
        </Typography>
      )}
      {data.checkout_action && !stale && (
        <Button variant="contained" size="small" fullWidth
          disabled={onAction ? (act.phase === 'busy' || items.length === 0) : undefined}
          onClick={onAction ? () => run('checkout.start', { items, total: data.total, currency: data.currency }) : undefined}
          sx={{ mt: 1, minHeight: onAction ? 44 : undefined, background: ACCENT, '&:hover': { background: ACCENT_HOVER } }}>
          {onAction && act.phase === 'busy' ? 'Opening checkout…' : 'Checkout'}
        </Button>
      )}
      <ActionError state={act} />
    </Box>
  );
}

function CheckoutOverlay({ data, onAction }) {
  const [act, run] = useActionRunner(onAction);
  const count = data.items_count || (Array.isArray(data.items) ? data.items.length : 0);
  const total = showMoney(data.total || data.amount, data.currency);
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Confirm Payment</Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
        {count} items &middot; {total}
      </Typography>
      {data.payment_methods && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
          {data.payment_methods.map((m, i) => <Chip key={i} label={m} size="small" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }} variant="outlined" />)}
        </Box>
      )}
      {onAction && (data.paid || data.cancelled) ? (
        <Typography role="status" variant="body2" sx={{ fontWeight: 600, color: data.paid ? SUCCESS : 'rgba(255,255,255,0.7)' }}>
          {data.paid ? `Paid ✓${data.order_id ? ` · Order ${data.order_id}` : ''}` : 'Payment cancelled'}
        </Typography>
      ) : onAction && data.approval_action ? (
        // AP2: the approval card is the one place to pay, so this card
        // does not offer a second "Pay" button.
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
          Waiting for your approval to pay.
        </Typography>
      ) : onAction ? (
        // Embed: the host bridge carries the confirm (AP2 -> host payment
        // rails with a user gesture); an agent-supplied URL is never fetched.
        <>
          <Button variant="contained" fullWidth disabled={act.phase === 'busy' || act.phase === 'done'}
            onClick={() => run('checkout.confirm', data)}
            sx={{ minHeight: 44, background: SUCCESS, '&:hover': { background: '#27AE60' } }}>
            {{ idle: `Pay ${total}`, busy: 'Waiting for approval…', done: 'Paid ✓', error: `Try again · Pay ${total}` }[act.phase]}
          </Button>
          <ActionError state={act} />
        </>
      ) : (
        <Button variant="contained" fullWidth
          sx={{ background: SUCCESS, '&:hover': { background: '#27AE60' } }}
          onClick={() => data.confirm_action && fetch(data.confirm_action, { method: 'POST' })}>
          Confirm Payment
        </Button>
      )}
    </Box>
  );
}

function PaymentStatusOverlay({ data }) {
  const icons = { success: <CheckCircleIcon sx={{ fontSize: 40, color: SUCCESS }} />, pending: <HourglassEmptyIcon sx={{ fontSize: 40, color: '#F39C12' }} />, error: <ErrorIcon sx={{ fontSize: 40, color: ERROR_RED }} /> };
  return (
    <Box sx={{ textAlign: 'center' }}>
      {icons[data.status] || icons.pending}
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1, textTransform: 'capitalize' }}>{data.status}</Typography>
      {data.amount && <Typography variant="h6" sx={{ fontWeight: 700, color: ACCENT }}>{data.amount}</Typography>}
      {data.method && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>via {data.method}</Typography>}
    </Box>
  );
}

function OrderTrackingOverlay({ data }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Order {data.order_id || ''}</Typography>
      {(data.steps || []).map((step, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.3 }}>
          {step.completed
            ? <CheckCircleIcon sx={{ fontSize: 16, color: SUCCESS }} />
            : <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }} />}
          <Typography variant="body2" aria-current={step.current ? 'step' : undefined}
            sx={{ color: step.completed ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: step.current ? 700 : undefined }}>{step.label || step.name}</Typography>
        </Box>
      ))}
      {data.eta && <Typography variant="caption" sx={{ color: INFO_BLUE, mt: 1, display: 'block' }}>ETA: {data.eta}</Typography>}
    </Box>
  );
}

function ComparisonOverlay({ data }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Comparison</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {(data.apps || []).map((app, i) => (
          <Box key={i} sx={{ flex: 1, p: 1, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{app.name}</Typography>
            {app.rating != null && <Rating value={app.rating} precision={0.5} size="small" readOnly />}
          </Box>
        ))}
      </Box>
      {data.winner && <Typography variant="caption" sx={{ color: SUCCESS, mt: 1, display: 'block' }}>Winner: {data.winner}</Typography>}
    </Box>
  );
}

function ProgressOverlay({ data }) {
  const pct = data.percent ?? data.value ?? 0;
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2">{data.label || data.title || 'Progress'}</Typography>
        <Typography variant="body2" sx={{ color: ACCENT }}>{Math.round(pct)}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct}
        sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(108,99,255,0.15)',
          '& .MuiLinearProgress-bar': { borderRadius: 3, background: `linear-gradient(90deg, ${ACCENT}, #9B59B6)` } }} />
    </Box>
  );
}

function AgentActionOverlay({ data }) {
  const icons = { running: <PlayCircleIcon sx={{ color: INFO_BLUE }} />, completed: <CheckCircleIcon sx={{ color: SUCCESS }} />, error: <ErrorIcon sx={{ color: ERROR_RED }} /> };
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      {icons[data.status] || icons.running}
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{data.action || data.title || 'Agent Action'}</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{data.description}</Typography>
        {data.result && <Typography variant="caption" sx={{ color: SUCCESS, display: 'block', mt: 0.5 }}>{data.result}</Typography>}
      </Box>
    </Box>
  );
}

// Why an answer on a card did not go through, in words the owner can act
// on: the server's own reason when it gave one (HARTOS answers
// {status, reason} or {success: false, error}), else the transport error.
function answerFailure(e) {
  const body = (e && e.response && e.response.data) || (e && e.body) || {};
  return String(body.reason || body.error || (e && e.message)
    || 'Your answer did not reach this computer; try again.');
}

// The line a card shows when an answer did not go through.
function AnswerError({ text }) {
  return (
    <Typography variant="caption" role="alert" sx={{display: 'block', color: ERROR_RED, mb: 1}}>
      {text}
    </Typography>
  );
}

function ApprovalOverlay({ data, onDismiss, onAction }) {
  const [act, run] = useActionRunner(onAction);
  // Which decision is on its way, and why the last one did not go through.
  // The card closes only once HARTOS has the answer: its .catch(() => {})
  // used to close it on a 404 or a 500 too, so an answer nobody recorded
  // looked exactly like one that was.
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  // Camera consent → NunbaChatProvider listens for this event and
  // mounts useCameraFrameStream, which opens WS to VisionService
  // :5460 and pipes JPEG frames at ~1fps.  The server protocol is
  // (user_id digit, 'video_start', binary frames) — not JSON.
  const applyCamera = (decision) => {
    const _action = String(data.action || '').toLowerCase();
    if (!_action.includes('camera') && !_action.includes('video')) return;
    try {
      window.dispatchEvent(new CustomEvent(NUNBA_CAMERA_CONSENT, {
        detail: {
          approved: decision === 'approve',
          user_id: data.user_id || data.agent_id,
        },
      }));
    } catch { /* CustomEvent unavailable (older WebView) */ }
  };

  const postDecision = async (decision) => {
    if (onAction) {
      // Embed: the session decides (AP2 goes through the host first).  The
      // card stays up with its error if the decision did not land.
      const res = await run('approval.decide', { ...data, decision });
      if (!res || res.ok !== false) onDismiss();
      return;
    }
    if (busy) return;
    setBusy(decision);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent/approval`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: data.agent_id, action: data.action, decision }),
      });
      if (!res.ok) {
        let body = {};
        try { body = await res.json(); } catch { /* not JSON */ }
        throw Object.assign(new Error(`The answer was refused (HTTP ${res.status})`), {body});
      }
    } catch (e) {
      console.error('[approval] decision not recorded', e);
      setError(answerFailure(e));
      setBusy(null);
      return;
    }
    applyCamera(decision);
    setBusy(null);
    onDismiss();
  };

  // `options` labels the three choices POSITIONALLY: [approve, deny, defer].
  // A missing or non-string entry keeps that button's default label, so the
  // button SET never shrinks.  Producers use it to say what the choice
  // MEANS: the game-sound card offers 'Keep it' / 'Compose another'.
  // Only approve | deny are answers /api/agent/approval records; HARTOS
  // refuses 'later' with 400, so the defer button closes the card and sends
  // nothing, like "Not now" on the consent card (the producer asks again).
  const label = (i, dflt) => {
    const o = Array.isArray(data.options) ? data.options[i] : null;
    return (typeof o === 'string' && o) ? o : dflt;
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{data.title || 'Approval Required'}</Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1.5 }}>{data.description}</Typography>
      {error && <AnswerError text={error} />}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: onAction ? 'wrap' : undefined }}>
        <Button variant="contained" size="small" disabled={Boolean(busy) || act.phase === 'busy'} aria-busy={busy === 'approve'} sx={{ background: SUCCESS, flex: 1, minHeight: onAction ? 44 : undefined, '&:hover': { background: '#27AE60' } }} onClick={() => postDecision('approve')}>{act.phase === 'busy' ? 'Working…' : label(0, 'Approve')}</Button>
        <Button variant="outlined" size="small" disabled={Boolean(busy) || act.phase === 'busy'} aria-busy={busy === 'deny'} sx={{ color: ERROR_RED, borderColor: ERROR_RED, flex: 1, minHeight: onAction ? 44 : undefined }} onClick={() => postDecision('deny')}>{label(1, 'Deny')}</Button>
        <Button variant="outlined" size="small" disabled={Boolean(busy) || act.phase === 'busy'} sx={{ color: onAction ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.2)', minHeight: onAction ? 44 : undefined }} onClick={onAction ? () => postDecision('later') : onDismiss}>{label(2, 'Later')}</Button>
      </Box>
      <ActionError state={act} />
    </Box>
  );
}

function ChartOverlay({ data }) {
  const items = data.data || data.items || [];
  const max = Math.max(...items.map(d => d.value || 0), 1);
  return (
    <Box>
      {data.title && <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{data.title}</Typography>}
      {items.map((d, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="caption" sx={{ width: 60, textAlign: 'right', color: 'rgba(255,255,255,0.6)' }}>{d.label}</Typography>
          <Box sx={{ flex: 1, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }}>
            <Box sx={{ width: `${(d.value / max) * 100}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${ACCENT}, #9B59B6)` }} />
          </Box>
          <Typography variant="caption" sx={{ width: 30, color: ACCENT }}>{d.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function CodeOverlay({ data }) {
  return (
    <Box>
      {data.filename && <Typography variant="caption" sx={{ color: ACCENT, mb: 0.5, display: 'block' }}>{data.filename}</Typography>}
      <Box component="pre" sx={{ background: '#1a1a2e', p: 1.5, borderRadius: '8px', overflowX: 'auto', fontSize: '0.75rem', fontFamily: 'monospace', color: '#e0e0e0', m: 0, maxHeight: 200 }}>
        <code>{data.code || data.content}</code>
      </Box>
    </Box>
  );
}

function MarkdownOverlay({ data }) {
  const text = data.content || data.text || '';
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:#64C8FF">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/g, '<br/>');
  return <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

function MediaOverlay({ data }) {
  const t = data.media_type || (data.url?.match(/\.(mp4|webm)/) ? 'video' : data.url?.match(/\.(mp3|wav|ogg)/) ? 'audio' : 'image');
  if (t === 'video') return <Box component="video" controls src={data.url} sx={{ width: '100%', borderRadius: '8px' }} />;
  if (t === 'audio') return <Box component="audio" controls src={data.url} sx={{ width: '100%' }} />;
  return <Box component="img" src={data.url} alt={data.alt || ''} sx={{ width: '100%', borderRadius: '8px' }} />;
}

function MetricOverlay({ data }) {
  const arrows = { up: <TrendingUpIcon sx={{ color: SUCCESS }} />, down: <TrendingDownIcon sx={{ color: ERROR_RED }} />, flat: <TrendingFlatIcon sx={{ color: 'rgba(255,255,255,0.4)' }} /> };
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ fontSize: 32, fontWeight: 700, color: ACCENT }}>{data.value}</Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>{data.label}</Typography>
      {data.trend && <Box sx={{ mt: 0.5 }}>{arrows[data.trend] || arrows.flat}</Box>}
    </Box>
  );
}

// Form submits HARTOS handles on this side, with no server round trip.
// Invite_Friend's share card names `copy_invite_url` and carries the link
// as its read-only field's value.
const LOCAL_SUBMIT_ACTIONS = {
  copy_invite_url: (values) => navigator.clipboard.writeText(values.invite_url || ''),
};

function FormOverlay({ data, onDismiss, onAction }) {
  // Fields may arrive pre-filled (`value`) or with a default: start from
  // those, so a read-only field shows what the producer sent.
  const [values, setValues] = useState(() => Object.fromEntries(
    (data.fields || [])
      .filter((f) => f && f.name && (f.value != null || f.default != null))
      .map((f) => [f.name, f.value != null ? f.value : f.default]),
  ));
  // Embed only: the per-field errors the host answers a submit with.
  const [errors, setErrors] = useState({});
  const [act, run] = useActionRunner(onAction);
  // The card closes only once the server took the values.  It used to post
  // with a bare fetch (no Bearer token, so the auth-required channel routes
  // answered 401), swallow the result and close anyway: a typed bot token
  // vanished with nothing on screen.  Same contract as the approval card.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const handleSubmit = async () => {
    if (onAction) {
      // Embed: the host bridge carries the submit; the card never posts to
      // an agent-supplied URL.
      const res = await run('form.submit', { action: data.action, values, form: data });
      setErrors((res && res.fieldErrors) || {});
      if (res && res.ok !== false) onDismiss();
      return;
    }
    if (busy) return;
    const local = LOCAL_SUBMIT_ACTIONS[data.submit_action];
    if (!data.action && !local) {
      // A form with nowhere to send its values is a producer bug; say so
      // rather than pretend the values went somewhere.
      console.error('[form] card has no action; values not sent', data);
      setError('This form cannot be submitted (no destination). Please report it.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (data.action) {
        await agentFormApi.submit(data.action, values);
      } else {
        await local(values);
      }
    } catch (e) {
      console.error('[form] submit failed', e);
      setError(answerFailure(e));
      setBusy(false);
      return;
    }
    setBusy(false);
    onDismiss();
  };
  return (
    <Box>
      {data.title && <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{data.title}</Typography>}
      {(data.fields || []).map((f, i) => (
        <TextField key={i} label={f.label || f.name} size="small" fullWidth
          type={f.secret ? 'password' : (f.type === 'textarea' ? 'text' : (f.type || 'text'))} required={f.required}
          multiline={f.type === 'textarea' || undefined} minRows={f.type === 'textarea' ? 3 : undefined}
          placeholder={f.placeholder}
          inputProps={f.inputMode ? { inputMode: f.inputMode } : undefined}
          InputProps={{ readOnly: Boolean(f.readonly) }}
          disabled={onAction ? act.phase === 'done' : undefined}
          error={!!errors[f.name]} helperText={errors[f.name] || f.help || undefined}
          InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
          value={values[f.name] || ''}
          onChange={e => {
            setError(null);
            setValues(v => ({ ...v, [f.name]: e.target.value }));
          }}
          sx={{ mb: 1, '& .MuiInputBase-root': { color: '#fff', background: 'rgba(255,255,255,0.05)' }, '& .MuiInputLabel-root': { color: onAction ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.5)' }, '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.45)' }, '& .MuiFormHelperText-root.Mui-error': { color: ERROR_RED } }} />
      ))}
      {error && <AnswerError text={error} />}
      <Button variant="contained" size="small" fullWidth
        disabled={onAction ? (act.phase === 'busy' || act.phase === 'done') : busy}
        aria-busy={onAction ? act.phase === 'busy' : busy}
        sx={{ minHeight: onAction ? 44 : undefined, background: ACCENT, '&:hover': { background: ACCENT_HOVER } }} onClick={handleSubmit}>
        {onAction && act.phase === 'busy' ? 'Submitting…' : onAction && act.phase === 'done' ? 'Done ✓' : (data.submit_label || 'Submit')}
      </Button>
      <ActionError state={act} />
    </Box>
  );
}

function ListOverlay({ data }) {
  const Tag = data.ordered ? 'ol' : 'ul';
  return (
    <Box>
      {data.title && <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>{data.title}</Typography>}
      <Box component={Tag} sx={{ pl: 2, m: 0, color: 'rgba(255,255,255,0.8)', '& li': { mb: 0.3, fontSize: '0.85rem' } }}>
        {(data.items || []).map((item, i) => <li key={i}>{typeof item === 'string' ? item : item.text || item.label}</li>)}
      </Box>
    </Box>
  );
}

function LayoutOverlay({ data, navigate, onDismiss, onAction }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: data.direction || 'column', gap: data.gap || 1 }}>
      {(data.children || []).map((child, i) => (
        <Box key={i}><OverlayContent data={child} navigate={navigate} onDismiss={onDismiss} onAction={onAction} /></Box>
      ))}
    </Box>
  );
}

function MeetCopilotOverlay({ data, onDismiss }) {
  const stateColors = { live: SUCCESS, paused: '#F39C12', ended: 'rgba(255,255,255,0.4)' };
  const stateColor = stateColors[data.state] || INFO_BLUE;
  const lines = Array.isArray(data.transcript_lines) ? data.transcript_lines : [];
  const decisions = Array.isArray(data.decisions) ? data.decisions : [];
  const actionItems = Array.isArray(data.action_items) ? data.action_items : [];
  const participants = Array.isArray(data.participants) ? data.participants : [];

  const handleLeave = () => {
    if (data.call_id) {
      fetch(`${API_BASE_URL}/api/social/agent/leave-room`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_id: data.call_id }),
      }).catch(() => {});
    }
    onDismiss && onDismiss();
  };

  return (
    <Box sx={{ minWidth: 280 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: stateColor,
                   boxShadow: data.state === 'live' ? `0 0 8px ${stateColor}` : 'none' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          {data.platform || 'meet'}{data.room_id ? ` · ${data.room_id}` : ''}
        </Typography>
        <Chip size="small" label={data.agent_role || 'co-pilot'}
              sx={{ background: 'rgba(108,99,255,0.2)', color: ACCENT, fontSize: '0.65rem' }} />
      </Box>
      {participants.length > 0 && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5 }}>
          {participants.length} participant{participants.length === 1 ? '' : 's'}
        </Typography>
      )}
      {lines.length > 0 && (
        <Box sx={{ mb: 1, maxHeight: 140, overflowY: 'auto', background: 'rgba(0,0,0,0.25)',
                   borderRadius: '8px', p: 1, fontSize: '0.8rem' }}>
          {lines.slice(-10).map((line, i) => (
            <Box key={i} sx={{ mb: 0.4, color: 'rgba(255,255,255,0.85)' }}>
              {line.speaker && (
                <Typography component="span" sx={{ fontWeight: 600, color: ACCENT, mr: 0.5, fontSize: '0.75rem' }}>
                  {line.speaker}:
                </Typography>
              )}
              <Typography component="span" sx={{ fontSize: '0.8rem' }}>{line.text || line}</Typography>
            </Box>
          ))}
        </Box>
      )}
      {decisions.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: SUCCESS, fontWeight: 600, display: 'block', mb: 0.25 }}>
            Decisions
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0, '& li': { fontSize: '0.78rem', mb: 0.2, color: 'rgba(255,255,255,0.85)' } }}>
            {decisions.map((d, i) => <li key={i}>{typeof d === 'string' ? d : d.text}</li>)}
          </Box>
        </Box>
      )}
      {actionItems.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: INFO_BLUE, fontWeight: 600, display: 'block', mb: 0.25 }}>
            Action items
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0, '& li': { fontSize: '0.78rem', mb: 0.2, color: 'rgba(255,255,255,0.85)' } }}>
            {actionItems.map((a, i) => <li key={i}>{typeof a === 'string' ? a : a.text}</li>)}
          </Box>
        </Box>
      )}
      <Button size="small" fullWidth variant="outlined"
              sx={{ borderColor: ERROR_RED, color: ERROR_RED, '&:hover': { borderColor: ERROR_RED, background: 'rgba(255,107,107,0.08)' } }}
              onClick={handleLeave}>
        Leave meet
      </Button>
    </Box>
  );
}

// ─── QR pairing overlay ──────────────────────────────────────────────
//
// Renders a QR code the user scans with their existing client app
// (WhatsApp → Linked devices, Telegram → Devices, Discord → Authorize).
// Driven by HARTOS's `agent_ui_update({type: 'qr_pair', qr, channel,
// title, help})` emitted from `_wire_qr_pair_emitter` after a successful
// register_channel for any auth_method='qr_session' channel.  Same Liquid
// UI pipe the rest of the overlays use — single emit path, no parallel
// surface.

function QRPairOverlay({ data, onDismiss }) {
  const qr = (data && data.qr) || '';
  const title = (data && data.title) || 'Scan to connect';
  const help = (data && data.help) || (
    'Open the app on your phone, find "Linked devices" or "Devices", '
    + 'and scan this code.'
  );
  // "Link with phone number": for someone whose only device is the phone
  // the QR is on.  HARTOS names the endpoint (pair_code_action); it mints
  // an 8-char code that arrives as a pair_code card.
  const pairAction = data && data.pair_code_action;
  const [byPhone, setByPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const requestCode = async () => {
    if (busy || !phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await agentFormApi.submit(pairAction, { phone });
    } catch (e) {
      console.error('[qr_pair] pair-code request failed', e);
      setError(answerFailure(e));
      setBusy(false);
      return;
    }
    setBusy(false);
    if (onDismiss) onDismiss();
  };
  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.25 }}>
        {title}
      </Typography>
      {qr ? (
        <Box
          sx={{
            display: 'inline-block',
            p: 2,
            bgcolor: '#fff',
            borderRadius: 2,
            boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
          }}
        >
          <QRCodeSVG value={qr} size={220} level="M" includeMargin={false} />
        </Box>
      ) : (
        <Box sx={{ py: 4 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Generating QR code…
          </Typography>
        </Box>
      )}
      <Typography
        variant="body2"
        sx={{ color: 'rgba(255,255,255,0.7)', mt: 2, lineHeight: 1.4 }}
      >
        {help}
      </Typography>
      {pairAction && byPhone && (
        <Box sx={{ mt: 1.5, textAlign: 'left' }}>
          <TextField label="Your phone number" size="small" fullWidth type="tel"
            value={phone} onChange={(e) => { setError(null); setPhone(e.target.value); }}
            placeholder="+91 90000 00000"
            sx={{ mb: 1, '& .MuiInputBase-root': { color: '#fff', background: 'rgba(255,255,255,0.05)' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }} />
          {error && <AnswerError text={error} />}
          <Button variant="contained" size="small" fullWidth disabled={busy || !phone.trim()}
            aria-busy={busy} onClick={requestCode}
            sx={{ background: ACCENT, '&:hover': { background: '#5A52E0' } }}>
            Send me a code
          </Button>
        </Box>
      )}
      {pairAction && !byPhone && (
        <Button size="small" variant="text" onClick={() => setByPhone(true)}
          sx={{ mt: 1, color: INFO_BLUE, textTransform: 'none' }}>
          Can't scan? Link with phone number
        </Button>
      )}
      {onDismiss && (
        <Button
          size="small"
          variant="text"
          onClick={onDismiss}
          sx={{ mt: 1.5, color: 'rgba(255,255,255,0.5)' }}
        >
          Cancel
        </Button>
      )}
    </Box>
  );
}

// ─── PairCodeOverlay — gateway_qr conversational onboarding ──────────
// Renders the 8-char OTP minted by the Baileys gateway (or any future
// gateway_qr channel).  Payload contract (HARTOS-side: hart_intelligence_
// entry._start_gateway_qr_pair_push):
//   {type:'pair_code', channel, display_name, color, icon, code,
//    expires_in, clipboard_payload, deeplink, instructions}
// Auto-copies code to clipboard on mount so the user can paste straight
// into WhatsApp without needing the explicit Copy button — same UX as
// the mobile RN ConsentOverlayService does via Clipboard.setString.
// Counts down expires_in so the user knows how fresh the code is.
function PairCodeOverlay({ data, onDismiss }) {
  const code = (data && data.code) || '';
  const displayName = (data && data.display_name) || (data && data.channel) || 'channel';
  const color = (data && data.color) || '#25D366';
  const expiresIn = Math.max(0, parseInt((data && data.expires_in) || 60, 10));
  const instructions = (data && data.instructions) || (
    `Open ${displayName} on your phone → Settings → Linked Devices → `
    + 'Link a Device → Link with phone number → paste this code.'
  );
  const deeplink = data && data.deeplink;
  const notificationId = data && data.notification_id;
  const [remaining, setRemaining] = useState(expiresIn);
  const [copied, setCopied] = useState(false);
  // P1-S3 (2026-05-26): when the pair-code expires, mark the
  // sibling Notification row read so the bell doesn't carry an
  // orphan unread entry forever.  Ref-guarded so we fire once per
  // overlay mount even if the countdown re-renders the component.
  const expireDispatchedRef = useRef(false);
  useEffect(() => {
    if (code) {
      // Best-effort silent copy on mount.  navigator.clipboard requires
      // HTTPS or localhost (Nunba's webview is on localhost so this
      // resolves).  Falls back to manual Copy button on insecure origin.
      try {
        navigator.clipboard.writeText(code).then(
          () => setCopied(true),
          () => { /* user can still use Copy button */ },
        );
      } catch { /* legacy webview without Clipboard API */ }
    }
    const interval = setInterval(
      () => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000,
    );
    return () => clearInterval(interval);
  }, [code]);
  useEffect(() => {
    if (remaining === 0 && notificationId && !expireDispatchedRef.current) {
      expireDispatchedRef.current = true;
      // Fire-and-forget; the bell's optimistic decrement (P1-S2) and
      // the server's 'notification.read' fan-out (P1-S1) handle the
      // UI sync on success.  On failure we just leave the row;
      // user can mark it read manually.
      try {
        notificationsApi.markRead([notificationId]).catch(() => {});
      } catch (_e) { /* noop */ }
    }
  }, [remaining, notificationId]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{
          width: 10, height: 10, bgcolor: color, borderRadius: '50%',
          boxShadow: `0 0 10px ${color}80`,
        }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Connect {displayName}
        </Typography>
      </Box>
      <Box sx={{
        my: 1.5, p: 2, textAlign: 'center',
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px dashed rgba(255,255,255,0.18)',
        borderRadius: 2,
      }}>
        <Typography
          sx={{
            fontFamily: 'monospace', fontSize: 28,
            letterSpacing: 6, fontWeight: 700, color,
          }}
        >
          {code || '••••••••'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          {remaining > 0 ? `Expires in ${remaining}s` : 'Expired — request a new code'}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}
      >
        {instructions}
        {copied && (
          <Typography component="span" sx={{ color, ml: 0.5, fontWeight: 600 }}>
            (copied to clipboard)
          </Typography>
        )}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5, justifyContent: 'flex-end' }}>
        <Button
          size="small" variant="outlined"
          onClick={() => {
            try {
              navigator.clipboard.writeText(code).then(() => setCopied(true));
            } catch { /* noop */ }
          }}
          sx={{ borderColor: color, color }}
        >
          {copied ? 'Copied' : 'Copy code'}
        </Button>
        {deeplink && (
          <Button
            size="small" variant="contained"
            onClick={() => { try { window.open(deeplink, '_blank'); } catch {} }}
            sx={{ bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(1.1)' } }}
          >
            Open on phone
          </Button>
        )}
        {onDismiss && (
          <Button size="small" variant="text" onClick={onDismiss}
                  sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Dismiss
          </Button>
        )}
      </Box>
    </Box>
  );
}

// ─── ChannelConnectedOverlay — success card emitted by the polling
// thread when HARTOS confirms gateway authenticated:true (and the
// same thread also calls register_channel so Hevolve/Nunba's adapter
// pool + admin Channels page see the binding as active).  Lightweight,
// auto-dismisses after 6s so it doesn't squat the overlay slot.
function ChannelConnectedOverlay({ data, onDismiss }) {
  const displayName = (data && data.display_name) || (data && data.channel) || 'channel';
  const color = (data && data.color) || '#00e89d';
  useEffect(() => {
    const t = setTimeout(() => { if (onDismiss) onDismiss(); }, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <Box sx={{
      p: 2, display: 'flex', alignItems: 'center', gap: 1.25,
    }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '50%',
        bgcolor: color, color: '#000', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 18,
      }}>✓</Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {displayName} connected
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          {(data && data.message) || 'Ready to send and receive.'}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Router: picks the right renderer ────────────────────────────────

// `onAction(kind, payload)` is optional.  Without it every card behaves as it
// always has in the app.  The <hart-agent> embed passes it so card buttons
// go through the host bridge (cart.add, checkout.start, payment.authorize…)
// instead of opening or POSTing agent-supplied URLs.
export function OverlayContent({ data, onDismiss, navigate, onAction }) {
  const type = data.type || data.component_type || 'notification';
  switch (type) {
    case 'notification': return <NotificationCard data={data} navigate={navigate} onDismiss={onDismiss} />;
    case 'toast': {
      // HARTOS toast = transient notification — same renderer, default
      // severity 'info' when omitted.  Reuses NotificationCard so the
      // glass + accent + actions plumbing stays a single canonical
      // implementation.
      const toastData = {...data, severity: data.severity || 'info'};
      return <NotificationCard data={toastData} navigate={navigate} onDismiss={onDismiss} />;
    }
    case 'oauth_link': {
      // OAuth handshake prompt — render as a notification with a
      // single navigate action pointing to the provider's authorize
      // URL.  Pattern parallels Liquid UI notification + actions; no
      // new renderer needed.  External http(s) target is honoured by
      // the navigate action via window.open below (kind='external').
      const oauthData = {
        title: data.title || `Sign in to ${data.provider || 'service'}`,
        message: data.description ||
          `Authorize ${data.provider || 'this service'} to continue.`,
        severity: data.severity || 'info',
        actions: data.authorize_url ? [{
          label: `Open ${data.provider || 'sign-in'}`,
          kind: 'external',
          target: data.authorize_url,
        }] : [],
      };
      return <NotificationCard data={oauthData} navigate={navigate} onDismiss={onDismiss} />;
    }
    case 'product_card': return <ProductCardOverlay data={data} onAction={onAction} />;
    case 'cart': return <CartOverlay data={data} onAction={onAction} />;
    case 'checkout': return <CheckoutOverlay data={data} onAction={onAction} />;
    case 'payment_status': return <PaymentStatusOverlay data={data} />;
    case 'order_tracking': return <OrderTrackingOverlay data={data} />;
    case 'comparison': return <ComparisonOverlay data={data} />;
    case 'progress': return <ProgressOverlay data={data} />;
    case 'agent_action': return <AgentActionOverlay data={data} />;
    case 'approval': return <ApprovalOverlay data={data} onDismiss={onDismiss} onAction={onAction} />;
    case 'chart': return <ChartOverlay data={data} />;
    case 'code': return <CodeOverlay data={data} />;
    case 'markdown': return <MarkdownOverlay data={data} />;
    case 'media': return <MediaOverlay data={data} />;
    case 'metric': return <MetricOverlay data={data} />;
    case 'form': return <FormOverlay data={data} onDismiss={onDismiss} onAction={onAction} />;
    case 'qr_pair': return <QRPairOverlay data={data} onDismiss={onDismiss} />;
    case 'pair_code': return <PairCodeOverlay data={data} onDismiss={onDismiss} />;
    case 'channel_connected': return <ChannelConnectedOverlay data={data} onDismiss={onDismiss} />;
    case 'list': return <ListOverlay data={data} />;
    case 'layout': return <LayoutOverlay data={data} navigate={navigate} onDismiss={onDismiss} onAction={onAction} />;
    case 'meet_copilot': return <MeetCopilotOverlay data={data} onDismiss={onDismiss} />;
    case 'consent_prompt': return <ConsentPromptOverlay data={data} onDismiss={onDismiss} />;
    case 'consent.request': return <ConsentPromptOverlay data={data} onDismiss={onDismiss} />;
    case 'post_preview': return <PostPreviewOverlay data={data} onDismiss={onDismiss} />;
    default:
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{data.title || type}</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{data.message || data.content || JSON.stringify(data)}</Typography>
        </Box>
      );
  }
}

// ─── Browser Research overlays (BR-C7 + C8) ─────────────────────────

// One consent card for two shapes: the browser-research consent_prompt
// (cloud_capability for one platform) and a HARTOS consent.request ask
// (ConsentService.request_consent).  The consent API grant writes a row
// with no agent, so a consent.request grant covers every agent and its
// button says so (constants/consentAsks.grantLabel) — except a person's
// device ask (#111), granted for that one phone by its exact scope.
function consentCardFor(data) {
  if (data.type === 'consent.request') {
    const type = data.consent_type;
    // An agent's ask names the agent; a phone's ask names the phone, and
    // that name is self-asserted: it goes in the title as a claim, the
    // body says what is asked without it, and the server's reason (which
    // states the name as fact) is not repeated.  The fingerprint of the
    // phone's key is what the owner matches against the phone.
    if (isPerRequester(type)) {
      return {
        consentType: type,
        scope: data.scope || '*',
        agentId: data.agent_id || null,
        title: askTitle(type, data.requester_name),
        text: `This phone asks to ${consentAskText(type)}.`,
        fingerprint: data.requester_fingerprint || deviceFingerprint(data.scope),
        caption: FINGERPRINT_CAPTION,
        grantLabel: grantLabel(type),
        declineLabel: canDecline(type) ? declineLabel(type, data.agent_id) : null,
      };
    }
    return {
      consentType: type,
      scope: data.scope || '*',
      agentId: data.agent_id || null,
      // A credential ask: the value is typed here and stored in this
      // computer's vault under this name before the grant.
      secretKey: asksForSecret(type) ? secretName(data.scope) : null,
      title: askTitle(type),
      text: data.reason ||
        `${askerName(data.agent_name)} asks to ${consentAskText(type)}.`,
      grantLabel: grantLabel(type),
      // A type with a card on the privacy page (the way back after a no),
      // or a credential ask, whose no ends that one ask (declineNote).
      declineLabel: canDecline(type)
        ? declineLabel(type, data.agent_id, data.agent_name) : null,
    };
  }
  const platform = data.platform || data.scope || 'platform';
  const scope = data.scope || `web_research:${platform}`;
  return {
    consentType: 'cloud_capability',
    scope,
    agentId: null,
    title: `Grant ${platform} research access`,
    text: data.description ||
      `The agent wants to use your logged-in ${platform} session to research. Cookies stay on your machine.`,
    grantLabel: `Grant ${scope}`,
    declineLabel: null,
  };
}

// Exported: the desktop companion window (VoiceOrb/VoiceOrbPage) shows the
// same card for a HARTOS consent.request, so an ask reaches the owner while
// the main window is behind other windows.  One card, one consent API.
export function ConsentPromptOverlay({ data, onDismiss }) {
  const card = consentCardFor(data || {});
  const [secret, setSecret] = useState('');
  // Why the last answer did not go through.  The card stays up with it: an
  // answer that silently closed the card looked written when it was not.
  const [error, setError] = useState(null);
  // Which answer is on its way ('grant' | 'decline'): that button spins, the
  // others wait, and a second click sends nothing.
  const [busy, setBusy] = useState(null);
  // A camera answer has to act HERE.  Every other consent is actuated
  // server-side (HARTOS grant_consent drives the embodied feed, and the
  // screen capture loop polls its own consent), but the camera frames come
  // from this browser: NunbaChatProvider listens for this event and mounts
  // useCameraFrameStream, which opens the WS to VisionService :5460.
  // Without it a camera grant would be a row that turns nothing on.
  const applyCamera = (approved) => {
    if (card.consentType !== CAMERA_CONSENT_TYPE) return;
    try {
      window.dispatchEvent(new CustomEvent(NUNBA_CAMERA_CONSENT, {
        detail: {approved, user_id: data?.user_id || data?.agent_id},
      }));
    } catch { /* CustomEvent unavailable (older WebView) */ }
  };
  const grant = async () => {
    if (busy) return;
    setBusy('grant');
    // A credential goes into the vault first; if it cannot be stored the ask
    // stays open, since a grant with nothing stored gives the agent nothing.
    if (card.secretKey) {
      let stored = null;
      try {
        stored = await chatApi.vaultStore({
          key_type: 'tool_key', key_name: card.secretKey, value: secret});
      } catch (e) {
        stored = {success: false, error: e?.message};
      }
      if (!stored?.success) {
        setError(stored?.error || 'Could not store it on this computer');
        setBusy(null);
        return;
      }
      // The field keeps the value until the card closes, so a grant that
      // does not go through can be sent again without typing it twice.
    }
    await answer('grant', () => consentApi.grant(
      {consent_type: card.consentType, scope: card.scope}), true);
  };
  // The ask's own agent: a no to one agent's ask leaves the others open.
  const decline = async () => {
    if (busy) return;
    setBusy('decline');
    await answer('decline', () => consentApi.decline({
      consent_type: card.consentType, scope: card.scope, agent_id: card.agentId,
    }), false);
  };
  // Send one answer.  Written: the card closes.  Not written: the card stays
  // with the reason and the buttons back, so the owner can answer again.
  const answer = async (what, send, approved) => {
    try {
      await send();
    } catch (e) {
      console.error(`[consent_prompt] ${what} failed`, e);
      setError(answerFailure(e));
      setBusy(null);
      return;
    }
    applyCamera(approved);
    setBusy(null);
    if (onDismiss) onDismiss();
  };
  return (
    <Box data-testid="liquid-consent-prompt" sx={{p: 1.5}}>
      <Typography variant="subtitle1" sx={{fontWeight: 700, mb: 0.5}}>
        {card.title}
      </Typography>
      <Typography variant="body2" sx={{opacity: 0.8, mb: 1.5}}>
        {card.text}
      </Typography>
      {card.fingerprint && (
        // The phone's key, as the phone shows it too: the owner matches the
        // two by eye before allowing.  monospace so the groups line up.
        <Box sx={{mb: 1.5}}>
          <Typography component="code" data-testid="liquid-consent-fingerprint"
            sx={{display: 'block', fontFamily: 'monospace', fontSize: '1.15rem',
              letterSpacing: '0.08em', color: '#fff'}}>
            {card.fingerprint}
          </Typography>
          <Typography variant="caption" sx={{display: 'block', opacity: 0.7}}>
            {card.caption}
          </Typography>
        </Box>
      )}
      {card.secretKey && (
        <Box sx={{mb: 1.5}}>
          <TextField type="password" size="small" fullWidth autoComplete="off"
            value={secret} onChange={(e) => { setSecret(e.target.value); setError(null); }}
            inputProps={{'data-testid': 'liquid-consent-secret', 'aria-label': 'Password or key'}}
            sx={{'& .MuiInputBase-root': {color: '#fff', background: 'rgba(255,255,255,0.05)'}}} />
        </Box>
      )}
      {error && <AnswerError text={error} />}
      {card.declineLabel && (
        <Typography variant="caption" sx={{display: 'block', opacity: 0.6, mb: 1}}>
          {declineNote(card.consentType, card.declineLabel)}
        </Typography>
      )}
      <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end'}}>
        <button className="btn-feedback" onClick={onDismiss} disabled={Boolean(busy)}
          style={{padding: '6px 14px', borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#ccc', cursor: 'pointer'}}>
          Not now
        </button>
        {card.declineLabel && (
          <button className="btn-feedback" onClick={decline} disabled={Boolean(busy)}
            aria-busy={busy === 'decline'}
            style={{padding: '6px 14px', borderRadius: 8, border: '1px solid #FF6B6B', background: 'transparent', color: '#FF6B6B', cursor: 'pointer'}}>
            {card.declineLabel}
          </button>
        )}
        <button className="btn-feedback" data-testid="liquid-consent-grant" onClick={grant}
          disabled={Boolean(busy) || (Boolean(card.secretKey) && !secret)}
          aria-busy={busy === 'grant'}
          style={{padding: '6px 14px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer'}}>
          {card.grantLabel}
        </button>
      </Box>
    </Box>
  );
}

function PostPreviewOverlay({ data, onDismiss }) {
  const platform = data?.platform || 'platform';
  const content = data?.content || '';
  const [posting, setPosting] = useState(false);
  const confirm = async () => {
    if (posting) return;
    setPosting(true);
    try {
      // Re-invoke the originating tool with dry_run=False.  We hit /chat with
      // a synthetic tool-call message; HARTOS dispatches to Post_As_User.
      const args = data?.confirm_args || {};
      await fetch('/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          input_text: `confirm post`,
          tool_call: {name: data?.confirm_tool || 'Post_As_User', args},
        }),
      });
    } catch (e) {
      console.error('[post_preview] confirm failed', e);
    } finally {
      setPosting(false);
      if (onDismiss) onDismiss();
    }
  };
  return (
    <Box data-testid="liquid-post-preview" sx={{p: 1.5}}>
      <Typography variant="subtitle1" sx={{fontWeight: 700, mb: 0.5}}>
        Preview: post to {platform}
      </Typography>
      <Box sx={{p: 1.5, mb: 1.5, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)'}}>
        <Typography variant="body2" sx={{whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.92)'}}>
          {content}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{display: 'block', opacity: 0.65, mb: 1}}>
        Posting as {data?.handle || 'your saved session'}
      </Typography>
      <Box sx={{display: 'flex', gap: 1, justifyContent: 'flex-end'}}>
        <button className="btn-feedback" onClick={onDismiss} disabled={posting}
          style={{padding: '6px 14px', borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#ccc', cursor: 'pointer'}}>
          {data?.cancel_label || 'Cancel'}
        </button>
        <button className="btn-feedback" data-testid="liquid-post-confirm" onClick={confirm}
          disabled={posting} aria-busy={posting}
          style={{padding: '6px 14px', borderRadius: 8, border: 'none', background: '#6C63FF', color: '#fff', fontWeight: 600, cursor: 'pointer'}}>
          {data?.confirm_label || `Post to ${platform}`}
        </button>
      </Box>
    </Box>
  );
}

// ─── Main Overlay Manager ────────────────────────────────────────────

// Optional props (the app passes none of them, so it is unchanged):
//   subscribe(handler) -> unsubscribe   card source; default realtimeService
//                                       'agent.ui.update'.  The embed passes
//                                       its session's FLOATING fragments,
//                                       already routed by constants/
//                                       liquidFragments.
//   onAction(kind, payload)             see OverlayContent
//   containerSx / cardSx                placement near the embed's orb, and
//                                       the embed's legibility underlay
//   cardTransition                      entrance transition component
//                                       (default MUI Grow); the embed passes
//                                       its own so every surface shares one
//                                       spring
export default function AgentOverlay({ navigate, onInlineChatCard, subscribe, onAction, containerSx, cardSx, cardTransition: CardTransition = Grow }) {
  const [overlays, setOverlays] = useState([]);
  const timersRef = useRef({});
  // msg_id -> overlay id, for the cards on screen now.  A producer that
  // sends the same message again while it waits for an answer (HARTOS
  // request_consent re-sends its ask on every look, same msg_id) shows one
  // card.  Once that card is answered, dismissed or evicted, its msg_id is
  // forgotten, so a later ask with the same id (after a revoke) shows.
  const showingRef = useRef(new Map());

  const forgetShowing = useCallback((id) => {
    for (const [msgId, overlayId] of showingRef.current) {
      if (overlayId === id) showingRef.current.delete(msgId);
    }
  }, []);

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    forgetShowing(id);
    setOverlays(prev => prev.filter(o => o._id !== id));
  }, [forgetShowing]);

  // An ask answered on any surface (this one, another window, another
  // device, a network guest) closes its card here: HARTOS broadcasts the
  // answer to every device of the user (constants/consentAsks).
  const settleAsks = useCallback((answer) => {
    setOverlays((prev) => {
      const gone = prev.filter((o) => o._type === 'consent.request'
        && answerCoversAsk(answer, o));
      if (gone.length === 0) return prev;
      gone.forEach((o) => {
        clearTimeout(timersRef.current[o._id]);
        delete timersRef.current[o._id];
        forgetShowing(o._id);
      });
      return prev.filter((o) => !gone.includes(o));
    });
  }, [forgetShowing]);

  const handleEvent = useCallback((payload) => {
    if (!payload) return;
    const type = payload.type || payload.component_type || 'notification';

    // An answer is not a card.  One that names an agent also travels on
    // agent.ui.update (realtimeService puts every typed payload with an
    // agent_id there) and used to render through the default branch as
    // raw JSON; the answer listener below is what acts on it.
    if (CONSENT_ANSWER_TYPES.includes(type)) return;

    // Navigate type: orchestrate page navigation, don't render overlay
    if (type === 'navigate' && navigate && payload.target) {
      navigate(payload.target);
      return;
    }

    // This message is already on screen.
    const msgId = payload.msg_id;
    if (msgId && showingRef.current.has(msgId)) return;

    // Inline chat card types: forward to Demopage message list AND show overlay
    if (onInlineChatCard && ['product_card', 'cart', 'checkout', 'comparison'].includes(type)) {
      onInlineChatCard(payload);
    }

    const id = ++_overlayIdCounter;
    const entry = { ...payload, _id: id, _type: type };
    if (msgId) showingRef.current.set(msgId, id);

    // Channel pairing cards follow the channel, not the message: WhatsApp
    // rotates its QR, so a newer code for the same channel replaces the
    // card in place (the old one would be a dead code), and once the
    // channel is connected its QR / pair-code cards go away.
    const pairingOf = (o) => (o._type === 'qr_pair' || o._type === 'pair_code')
      && payload.channel && o.channel === payload.channel;

    setOverlays(prev => {
      if (type === 'qr_pair') {
        const i = prev.findIndex(o => o._type === 'qr_pair' && pairingOf(o));
        if (i >= 0) {
          const next = [...prev];
          forgetShowing(prev[i]._id);
          if (msgId) showingRef.current.set(msgId, prev[i]._id);
          next[i] = { ...entry, _id: prev[i]._id };
          return next;
        }
      }
      // Connected, or the attempt failed for good (HARTOS's error toast for
      // that channel: gateway down, code expired): its QR is dead either way.
      if (type === 'channel_connected'
          || (type === 'toast' && payload.severity === 'error')) {
        prev.filter(pairingOf).forEach((o) => {
          clearTimeout(timersRef.current[o._id]);
          delete timersRef.current[o._id];
          forgetShowing(o._id);
        });
        prev = prev.filter(o => !pairingOf(o));
      }
      const next = [...prev, entry];
      // FIFO eviction if over max
      while (next.length > MAX_OVERLAYS) {
        const evicted = next.shift();
        clearTimeout(timersRef.current[evicted._id]);
        delete timersRef.current[evicted._id];
        forgetShowing(evicted._id);
      }
      return next;
    });

    // Auto-dismiss (except persistent types)
    if (!PERSIST_TYPES.has(type)) {
      timersRef.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    }
  }, [navigate, onInlineChatCard, dismiss, forgetShowing]);

  useEffect(() => {
    // Single subscription — realtimeService handles all transports
    // (WAMP primary, SSE fallback with auto-reconnect and dedup).
    // No transport-specific code here.
    const unsub = subscribe
      ? subscribe(handleEvent)
      : realtimeService.on('agent.ui.update', handleEvent);
    const unsubAnswers = CONSENT_ANSWER_TYPES.map(
      (t) => realtimeService.on(t, settleAsks));

    return () => {
      unsub();
      unsubAnswers.forEach((u) => u && u());
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, [handleEvent, settleAsks, subscribe]);

  if (overlays.length === 0) return null;

  return (
    <Box sx={{
      position: 'fixed', bottom: { xs: 16, md: 80 }, right: { xs: 8, md: 16 },
      zIndex: 9998, display: 'flex', flexDirection: 'column-reverse', gap: 1.5,
      width: { xs: 'calc(100% - 16px)', sm: 340 }, maxHeight: '80vh', pointerEvents: 'none',
      ...containerSx,
    }}>
      {overlays.map((overlay) => (
        <CardTransition in key={overlay._id} timeout={300}>
          <Box sx={{
            ...GLASS, p: 2, position: 'relative', pointerEvents: 'auto',
            animation: 'agentSlideUp 0.3s ease',
            '@keyframes agentSlideUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
            ...cardSx,
          }}>
            {/* Agent badge: the agent's name.  A bare id (a prompt id) means
                nothing to a person, so an overlay with only an id gets no
                badge. */}
            {overlay.agent_name && (
              <Chip label={overlay.agent_name} size="small"
                sx={{ position: 'absolute', top: 8, left: 12, fontSize: '0.65rem', height: 20,
                  background: 'rgba(108,99,255,0.2)', color: ACCENT, border: '1px solid rgba(108,99,255,0.3)' }} />
            )}
            {/* Close button */}
            <IconButton size="small" aria-label="Dismiss" onClick={() => dismiss(overlay._id)}
              sx={{ position: 'absolute', top: 4, right: 4, color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#fff' } }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Box sx={{ mt: overlay.agent_name ? 2.5 : 0 }}>
              <OverlayContent data={overlay} onDismiss={() => dismiss(overlay._id)} navigate={navigate} onAction={onAction} />
            </Box>
          </Box>
        </CardTransition>
      ))}
    </Box>
  );
}
