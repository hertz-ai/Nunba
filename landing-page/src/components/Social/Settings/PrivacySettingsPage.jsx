/**
 * PrivacySettingsPage.jsx — F3 GREENLIT (master-orchestrator aa3ead1,
 * post-prereq f05a396).
 *
 * UserConsent UI for the `cloud_capability` scope.  Lets the user
 * grant/revoke per-capability consent that the server uses to gate
 * cloud-side processing (e.g. encounter_icebreaker drafting via a
 * central-topology LLM).
 *
 * Backend chain (verified, do NOT re-verify):
 *   POST /api/social/consent          — APPEND a new row.  See
 *     HARTOS integrations/social/consent_api.py:117 (grant_consent).
 *     Re-grant after revoke creates a NEW row; revoked rows are
 *     PRESERVED in the audit trail.
 *   POST /api/social/consent/revoke   — set revoked_at on the
 *     most-recent active row; granted_at is NEVER rewritten.  See
 *     consent_api.py:173 (revoke_consent).
 *   GET  /api/social/consent          — newest-first list.  Filters:
 *     consent_type, active_only.  See consent_api.py:231 (list_consents).
 *
 * DRY guard (orchestrator-flagged):
 *   This UI MUST consume `/api/social/consent` ONLY.  The legacy
 *   `/api/consent/<user_id>/*` surface in consent_service.py is
 *   UPSERT semantics + a 5-item CONSENT_TYPES allowlist that DOES
 *   NOT include 'cloud_capability'.  Calling it would corrupt the
 *   audit trail.
 *
 * Mission anchors (orchestrator-mandated):
 *   1) Append-only history visible — the audit panel renders all rows
 *      newest-first; we never suggest revoke "deletes" anything.
 *   2) Re-grant creates a NEW row — after every grant/revoke we
 *      refetch the list so the visible audit count grows.
 *   3) Defensive consent dialog — Grant button is gated behind an
 *      "I understand" checkbox AND, for scopes flagged
 *      requires_age_18 (encounter_icebreaker), an additional 18+
 *      checkbox.  Defense-in-depth at the UI; server is still the
 *      authority on every invariant.
 *   4) Privacy-first copy — "Drafts run locally without it" framing
 *      makes consent feel opt-in by default.
 */
/* eslint-disable no-unused-vars */
import {
  CLOUD_CAPABILITY_TYPE,
  CLOUD_CAPABILITY_SCOPES,
  GRANTABLE_SCOPES,
  formatScopeLabel,
  formatScopeDescription,
  scopeRequiresAgeClaim,
} from './cloudCapabilityScopes';
import {DEVICE_ACCESS, PHONE_STATES, trustedPhones} from './trustedPhones';

import {allowAllLabel} from '../../../constants/consentAsks';
import {consentApi} from '../../../services/socialApi';

import {
  CloudOff,
  Cloud,
  CheckCircleOutline,
  Computer,
  HighlightOff,
  ExpandMore,
  ExpandLess,
  History,
  Smartphone,
  Visibility,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  IconButton,
} from '@mui/material';
import React, {useState, useEffect, useCallback, useMemo} from 'react';

const glass = {
  bgcolor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 2,
};

const STATUS_COLORS = {
  // emerald = active; muted = revoked. Matches accessibility-reviewer gate
  // (status pill announceable + visually distinct).
  active: {
    bg: 'rgba(46,204,113,0.18)',
    border: 'rgba(46,204,113,0.55)',
    fg: '#2ECC71',
  },
  revoked: {
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.18)',
    fg: 'rgba(255,255,255,0.55)',
  },
};

function isActive(row) {
  return Boolean(row && row.granted && !row.revoked_at);
}

function formatRelative(iso) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const now = Date.now();
  const sec = Math.floor((now - t) / 1000);
  if (sec < 0) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatAbsolute(iso) {
  if (!iso) return '';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleString();
}

function truncateId(id) {
  if (!id) return '';
  if (id.length <= 10) return id;
  return `${id.slice(0, 8)}…`;
}

// ── Dialog: Grant ────────────────────────────────────────────────────────
function GrantDialog({open, scope, onClose, onConfirm, busy}) {
  const requiresAge = scopeRequiresAgeClaim(scope);
  const [understood, setUnderstood] = useState(false);
  const [age18, setAge18] = useState(false);

  // Reset on every open — never persist across mounts (matches
  // DiscoverableTogglePanel mission anchor 1).
  useEffect(() => {
    if (open) {
      setUnderstood(false);
      setAge18(false);
    }
  }, [open]);

  const canGrant = understood && (!requiresAge || age18) && !busy;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="grant-consent-title"
    >
      <DialogTitle id="grant-consent-title" sx={{fontWeight: 600}}>
        Cloud capability — confirm
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{mb: 1.5}}>
          <strong>{formatScopeLabel(scope)}</strong>
        </DialogContentText>
        <DialogContentText sx={{mb: 2}}>
          {formatScopeDescription(scope)}
        </DialogContentText>
        <Stack spacing={0.5}>
          <FormControlLabel
            control={
              <Checkbox
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                inputProps={{
                  'aria-required': 'true',
                  'data-testid': 'grant-understand-checkbox',
                }}
              />
            }
            label="I understand that granting this consent enables cloud-side processing for this feature."
          />
          {requiresAge && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={age18}
                  onChange={(e) => setAge18(e.target.checked)}
                  inputProps={{
                    'aria-required': 'true',
                    'data-testid': 'grant-age18-checkbox',
                  }}
                />
              }
              label="I confirm I am 18 or older."
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{px: 3, pb: 2}}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={!canGrant}
          variant="contained"
          data-testid="grant-confirm-button"
          startIcon={busy ? <CircularProgress size={16} /> : <Cloud />}
          sx={{
            bgcolor: '#6C63FF',
            '&:hover': {bgcolor: '#5A52E0'},
          }}
        >
          Grant consent
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog: Revoke ───────────────────────────────────────────────────────
function RevokeDialog({open, scope, onClose, onConfirm, busy}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="revoke-consent-title"
    >
      <DialogTitle id="revoke-consent-title" sx={{fontWeight: 600}}>
        Revoke cloud capability
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{mb: 1.5}}>
          <strong>{formatScopeLabel(scope)}</strong>
        </DialogContentText>
        <DialogContentText>
          This will disable {formatScopeLabel(scope).toLowerCase()} immediately.
          You can re-grant later, but the original consent stays in your audit
          history.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{px: 3, pb: 2}}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={busy}
          variant="contained"
          color="error"
          data-testid="revoke-confirm-button"
          startIcon={busy ? <CircularProgress size={16} /> : <CloudOff />}
        >
          Revoke
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Status Pill ──────────────────────────────────────────────────────────
function StatusPill({active}) {
  const colors = active ? STATUS_COLORS.active : STATUS_COLORS.revoked;
  return (
    <Box
      role="status"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: '9999px',
        fontSize: 11,
        fontWeight: 600,
        bgcolor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.fg,
        minWidth: 60,
        justifyContent: 'center',
      }}
    >
      {active ? (
        <CheckCircleOutline sx={{fontSize: 13}} aria-hidden="true" />
      ) : (
        <HighlightOff sx={{fontSize: 13}} aria-hidden="true" />
      )}
      {active ? 'Active' : 'Revoked'}
    </Box>
  );
}

// ── Per-Scope Row ────────────────────────────────────────────────────────
function ScopeRow({scope, activeRow, onGrant, onRevoke}) {
  const active = isActive(activeRow);
  return (
    <Box
      data-testid={`scope-row-${scope}`}
      sx={{
        display: 'flex',
        flexDirection: {xs: 'column', sm: 'row'},
        alignItems: {xs: 'flex-start', sm: 'center'},
        justifyContent: 'space-between',
        gap: 1.5,
        py: 1.5,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        '&:last-child': {borderBottom: 'none'},
      }}
    >
      <Box sx={{flex: 1, minWidth: 0}}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant="body1"
            sx={{color: '#fff', fontWeight: 500, mr: 1}}
          >
            {formatScopeLabel(scope)}
          </Typography>
          <StatusPill active={active} />
        </Box>
        <Typography
          variant="caption"
          sx={{color: 'rgba(255,255,255,0.55)', display: 'block', mt: 0.5}}
        >
          {formatScopeDescription(scope)}
        </Typography>
        {activeRow && (
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.4)',
              display: 'block',
              mt: 0.5,
            }}
          >
            <Tooltip title={formatAbsolute(activeRow.granted_at)}>
              <span>Granted {formatRelative(activeRow.granted_at)}</span>
            </Tooltip>
            {activeRow.revoked_at && (
              <Tooltip title={formatAbsolute(activeRow.revoked_at)}>
                <span>
                  {' · revoked '}
                  {formatRelative(activeRow.revoked_at)}
                </span>
              </Tooltip>
            )}
          </Typography>
        )}
      </Box>
      <Box>
        {active ? (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => onRevoke(scope)}
            data-testid={`revoke-btn-${scope}`}
            startIcon={<CloudOff />}
          >
            Revoke
          </Button>
        ) : (
          <Button
            variant="contained"
            size="small"
            onClick={() => onGrant(scope)}
            data-testid={`grant-btn-${scope}`}
            startIcon={<Cloud />}
            sx={{
              bgcolor: '#6C63FF',
              '&:hover': {bgcolor: '#5A52E0'},
            }}
          >
            Grant
          </Button>
        )}
      </Box>
    </Box>
  );
}

// ── Audit History ────────────────────────────────────────────────────────
function AuditHistory({rows, expanded, onToggle}) {
  return (
    <Paper sx={{...glass, p: 2.5, mt: 2}}>
      <Box
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={expanded}
        aria-controls="audit-history-content"
        data-testid="audit-history-toggle"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          '&:hover': {opacity: 0.85},
        }}
      >
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
          <History sx={{color: 'rgba(255,255,255,0.6)', fontSize: 18}} />
          <Typography variant="subtitle2" sx={{color: '#fff', fontWeight: 600}}>
            Audit history
          </Typography>
          <Chip
            label={rows.length}
            size="small"
            sx={{
              ml: 0.5,
              bgcolor: 'rgba(108,99,255,0.2)',
              color: '#6C63FF',
              fontSize: 10,
              height: 18,
            }}
          />
        </Box>
        <IconButton size="small" sx={{color: 'rgba(255,255,255,0.5)'}}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      <Collapse in={expanded} id="audit-history-content">
        <Box sx={{mt: 2, overflowX: 'auto'}}>
          {rows.length === 0 ? (
            <Typography
              variant="body2"
              sx={{color: 'rgba(255,255,255,0.5)', py: 1}}
            >
              No consent activity yet.
            </Typography>
          ) : (
            <Table size="small" data-testid="audit-history-table">
              <TableHead>
                <TableRow>
                  <TableCell scope="col" sx={{color: 'rgba(255,255,255,0.6)'}}>
                    Scope
                  </TableCell>
                  <TableCell scope="col" sx={{color: 'rgba(255,255,255,0.6)'}}>
                    Status
                  </TableCell>
                  <TableCell scope="col" sx={{color: 'rgba(255,255,255,0.6)'}}>
                    Granted
                  </TableCell>
                  <TableCell scope="col" sx={{color: 'rgba(255,255,255,0.6)'}}>
                    Revoked
                  </TableCell>
                  <TableCell scope="col" sx={{color: 'rgba(255,255,255,0.6)'}}>
                    ID
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const active = isActive(r);
                  return (
                    <TableRow
                      key={r.id}
                      data-testid={`audit-row-${r.id}`}
                      sx={{
                        opacity: active ? 1 : 0.65,
                        '& td': {
                          color: '#fff',
                          borderColor: 'rgba(255,255,255,0.06)',
                        },
                      }}
                    >
                      <TableCell>{formatScopeLabel(r.scope)}</TableCell>
                      <TableCell>
                        <StatusPill active={active} />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={formatAbsolute(r.granted_at)}>
                          <span>{formatRelative(r.granted_at)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {r.revoked_at ? (
                          <Tooltip title={formatAbsolute(r.revoked_at)}>
                            <span>{formatRelative(r.revoked_at)}</span>
                          </Tooltip>
                        ) : (
                          <span style={{color: 'rgba(255,255,255,0.4)'}}>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title={r.id}>
                          <span style={{fontFamily: 'monospace', fontSize: 11}}>
                            {truncateId(r.id)}
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────
// ── On/off consent cards (one consent type, scope '*') ───────────────────
// Each card reads and writes its own consent type through the SAME
// consentApi (`/api/social/consent`) the cloud_capability section uses — no
// parallel data path, and zero changes to the cloud_capability logic.
// Default OFF.  Revoke is an instant kill-switch: HARTOS
// consent_api.revoke_consent ends every active grant of the type.
function BlanketConsentCard({
  consentType,
  Icon = Cloud,
  title,
  description,
  enableLabel,
  disableLabel,
  confirmTitle,
  confirmText,
  understandLabel,
  confirmLabel,
  enabledMessage,
  disabledMessage,
}) {
  // public_exposure -> public-exposure-card, -status, -grant, -revoke, ...
  const testId = consentType.replace(/_/g, '-');
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [snack, setSnack] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await consentApi.list({
        consent_type: consentType, active_only: true,
      });
      const rows = (res && (res.consents || (res.data && res.data.consents))) || [];
      setActive(rows.some((r) => isActive(r)) || rows.length > 0);
    } catch (e) {
      setActive(false); // fail-closed display
    } finally {
      setLoading(false);
    }
  }, [consentType]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (confirmOpen) setUnderstood(false); }, [confirmOpen]);

  const onGrant = useCallback(async () => {
    setBusy(true);
    try {
      await consentApi.grant({consent_type: consentType, scope: '*'});
      setSnack({severity: 'success', msg: enabledMessage});
      setConfirmOpen(false);
      await refresh();
    } catch (e) {
      setSnack({severity: 'error', msg: 'Could not enable — please retry.'});
    } finally {
      setBusy(false);
    }
  }, [consentType, enabledMessage, refresh]);

  const onRevoke = useCallback(async () => {
    setBusy(true);
    try {
      await consentApi.revoke({consent_type: consentType, scope: '*'});
      setSnack({severity: 'success', msg: disabledMessage});
      await refresh();
    } catch (e) {
      setSnack({severity: 'error', msg: 'Could not disable — please retry.'});
    } finally {
      setBusy(false);
    }
  }, [consentType, disabledMessage, refresh]);

  return (
    <Paper sx={{...glass, p: 2.5, mb: 2.5}} data-testid={`${testId}-card`}>
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
        <Icon sx={{color: '#6C63FF'}} />
        <Typography variant="subtitle1" sx={{color: '#fff', fontWeight: 600}}>
          {title}
        </Typography>
        <Chip
          size="small"
          label={active ? 'Enabled' : 'Off'}
          data-testid={`${testId}-status`}
          sx={{
            ml: 'auto',
            bgcolor: active ? STATUS_COLORS.active.bg : STATUS_COLORS.revoked.bg,
            color: active ? STATUS_COLORS.active.fg : STATUS_COLORS.revoked.fg,
            border: `1px solid ${active ? STATUS_COLORS.active.border : STATUS_COLORS.revoked.border}`,
          }}
        />
      </Box>
      <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.6)', mb: 2}}>
        {description}
      </Typography>
      {loading ? (
        <CircularProgress size={18} />
      ) : active ? (
        <Button
          onClick={onRevoke}
          disabled={busy}
          variant="outlined"
          color="inherit"
          startIcon={busy ? <CircularProgress size={16} /> : <HighlightOff />}
          data-testid={`${testId}-revoke`}
        >
          {disableLabel}
        </Button>
      ) : (
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
          variant="contained"
          startIcon={<Icon />}
          data-testid={`${testId}-grant`}
          sx={{bgcolor: '#6C63FF', '&:hover': {bgcolor: '#5A52E0'}}}
        >
          {enableLabel}
        </Button>
      )}

      <Dialog
        open={confirmOpen}
        onClose={busy ? undefined : () => setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{fontWeight: 600}}>{confirmTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{mb: 2}}>
            {confirmText}
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                inputProps={{'data-testid': `${testId}-understand`}}
              />
            }
            label={understandLabel}
          />
        </DialogContent>
        <DialogActions sx={{px: 3, pb: 2}}>
          <Button onClick={() => setConfirmOpen(false)} disabled={busy} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={onGrant}
            disabled={!understood || busy}
            variant="contained"
            data-testid={`${testId}-confirm`}
            startIcon={busy ? <CircularProgress size={16} /> : <Icon />}
            sx={{bgcolor: '#6C63FF', '&:hover': {bgcolor: '#5A52E0'}}}
          >
            {confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Paper>
  );
}

const PHONE_STATE_STYLE = {
  [PHONE_STATES.ALLOWED]: STATUS_COLORS.active,
  [PHONE_STATES.BLOCKED]: STATUS_COLORS.revoked,
  [PHONE_STATES.PENDING]: {
    bg: 'rgba(243,156,18,0.18)', border: 'rgba(243,156,18,0.55)', fg: '#F39C12',
  },
};

// The owner's phones (#111).  A phone on the network asks for this
// computer's agents through the consent card; every phone that ever asked
// is one row here -- the name it gave itself, the fingerprint of its key,
// and its state -- acted on by its own scope.  There is no allow-all: a
// blanket device_access row admits no phone (HARTOS consent_api refuses it
// with 400), so offering one would only look like consent.  Allow = POST
// /consent (a granted row for that key; the gate admits the phone), Block =
// POST /consent/revoke (ends its grants), Don't allow on a pending ask =
// POST /consent/decline with no agent (the ask is declined and not asked
// again; Allow here is the way back).  Exported for its own test.
export function TrustedPhonesCard() {
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyScope, setBusyScope] = useState(null);
  const [snack, setSnack] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Every row, not active_only: BLOCKED and PENDING live in the revoked
      // and ungranted rows.  axiosFactory resolves the response body, HARTOS's
      // {success, data: {consents}} envelope.
      const res = await consentApi.list({consent_type: DEVICE_ACCESS});
      setPhones(trustedPhones((res && res.data && res.data.consents) || []));
    } catch (e) {
      setSnack({severity: 'error', msg: 'Could not load your phones — please retry.'});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = useCallback(async (scope, call, doneMsg, failMsg) => {
    setBusyScope(scope);
    try {
      await call();
      setSnack({severity: 'success', msg: doneMsg});
      await refresh();
    } catch (e) {
      setSnack({severity: 'error', msg: failMsg});
    } finally {
      setBusyScope(null);
    }
  }, [refresh]);

  // The messages name the phone by its fingerprint: the label is what the
  // phone said about itself.
  const allow = (phone) => act(phone.scope,
    () => consentApi.grant({consent_type: DEVICE_ACCESS, scope: phone.scope}),
    `Phone ${phone.fingerprint} may reach this computer.`, 'Could not allow — please retry.');
  const block = (phone) => act(phone.scope,
    () => consentApi.revoke({consent_type: DEVICE_ACCESS, scope: phone.scope}),
    `Phone ${phone.fingerprint} can no longer reach this computer.`,
    'Could not block — please retry.');
  const decline = (phone) => act(phone.scope,
    () => consentApi.decline({consent_type: DEVICE_ACCESS, scope: phone.scope, agent_id: null}),
    `Phone ${phone.fingerprint} was not allowed.`, 'Could not answer — please retry.');

  return (
    <Paper sx={{...glass, p: 2.5, mb: 2.5}} data-testid="device-access-card">
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
        <Smartphone sx={{color: '#6C63FF'}} />
        <Typography variant="subtitle1" sx={{color: '#fff', fontWeight: 600}}>
          Phones reaching this computer
        </Typography>
      </Box>
      <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.6)', mb: 2}}>
        A phone on your network can ask to use this computer&apos;s agents. Each
        phone is allowed or blocked on its own, by the code it shows; the name
        is what the phone calls itself. Blocking stops it immediately.
      </Typography>
      {loading && phones.length === 0 ? (
        <CircularProgress size={18} />
      ) : phones.length === 0 ? (
        <Typography variant="body2" sx={{color: 'rgba(255,255,255,0.55)'}}
          data-testid="phones-empty">
          No phone has asked to reach this computer yet. When one does, a card
          asks you, and the phone appears here.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {phones.map((phone) => {
            const id = phone.fingerprint.replace(/\s+/g, '');
            const style = PHONE_STATE_STYLE[phone.state];
            const busy = busyScope === phone.scope;
            return (
              <Box key={phone.scope} data-testid={`phone-row-${id}`}
                sx={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1,
                  p: 1.25, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)'}}>
                <Box sx={{flex: 1, minWidth: 160}}>
                  <Typography variant="body2" sx={{color: '#fff', fontWeight: 600}}>
                    {phone.label}
                  </Typography>
                  <Typography component="code"
                    sx={{display: 'block', fontFamily: 'monospace', letterSpacing: '0.08em',
                      color: 'rgba(255,255,255,0.75)'}}>
                    {phone.fingerprint}
                  </Typography>
                </Box>
                <Chip size="small" label={phone.state} data-testid={`phone-state-${id}`}
                  sx={{bgcolor: style.bg, color: style.fg, border: `1px solid ${style.border}`}} />
                {phone.state === PHONE_STATES.ALLOWED ? (
                  <Button size="small" variant="outlined" color="inherit" disabled={busy}
                    onClick={() => block(phone)} data-testid={`phone-block-${id}`}
                    startIcon={busy ? <CircularProgress size={14} /> : <HighlightOff />}>
                    Block
                  </Button>
                ) : (
                  <>
                    <Button size="small" variant="contained" disabled={busy}
                      onClick={() => allow(phone)} data-testid={`phone-allow-${id}`}
                      sx={{bgcolor: '#6C63FF', '&:hover': {bgcolor: '#5A52E0'}}}>
                      Allow
                    </Button>
                    {phone.state === PHONE_STATES.PENDING && (
                      <Button size="small" variant="outlined" disabled={busy}
                        onClick={() => decline(phone)} data-testid={`phone-decline-${id}`}
                        sx={{color: '#FF6B6B', borderColor: '#FF6B6B'}}>
                        Don&apos;t allow
                      </Button>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>
            {snack.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Paper>
  );
}

// Autonomous external posting.  Granting flips the server-side gate that
// marketing_tools._external_post_allowed + federated_aggregator enforce
// (fail-closed).
const PUBLIC_EXPOSURE_CARD = {
  consentType: 'public_exposure',
  title: 'Autonomous external posting',
  description:
    'Lets your agents post on your behalf to external channels (your social ' +
    'accounts, communities) to grow reach — without asking each time. Off by ' +
    'default; nothing leaves the platform until you enable it. Reversible ' +
    'anytime — revoking stops all autonomous external posting immediately.',
  enableLabel: 'Enable external posting',
  disableLabel: 'Disable external posting',
  confirmTitle: 'Enable autonomous external posting?',
  confirmText:
    'Your agents will be able to publish posts to external channels under ' +
    'your identity, on their own, to grow reach. You can revoke this at ' +
    'any time and it stops immediately.',
  understandLabel: 'I understand my agents may post publicly on my behalf.',
  confirmLabel: 'Enable',
  enabledMessage: 'Autonomous external posting enabled.',
  disabledMessage: 'Autonomous external posting disabled.',
};

// Agents acting on this computer.  HARTOS integrations/vlm/safety.
// computer_control_block asks the owner before any agent runs shell
// commands, writes files or drives the mouse and keyboard; the ask itself
// names what is covered.  A grant here is the way back after the owner
// answered an agent's ask with "Don't allow": it covers every agent.
const COMPUTER_CONTROL_CARD = {
  consentType: 'computer_control',
  Icon: Computer,
  title: 'Agents controlling this computer',
  description:
    'Lets every agent act on this computer without asking each time. Off ' +
    'by default: until you allow it, each agent asks you first, and an ' +
    'agent you said no to stays refused until you allow agents here. ' +
    'Revoking stops it immediately.',
  enableLabel: allowAllLabel('computer_control'),
  disableLabel: 'Stop agents controlling this computer',
  confirmTitle: `${allowAllLabel('computer_control')}?`,
  confirmText:
    'Every agent will be able to act on this computer without asking you ' +
    'first. You can revoke this at any time and it stops immediately.',
  understandLabel: 'I understand every agent can act on this computer without asking.',
  confirmLabel: 'Allow',
  enabledMessage: 'Agents may control this computer.',
  disabledMessage: 'Agents can no longer control this computer.',
};

// Agents seeing this screen.  HARTOS VisionService captures and describes
// the desktop's screen for the visual agent once the owner allows it
// (#701); until then its capture loop asks the owner.  This card is also
// the way back after a "Don't allow" on that ask.
const SCREEN_CAPTURE_CARD = {
  consentType: 'screen_capture',
  Icon: Visibility,
  title: 'Agents seeing this screen',
  description:
    "Lets agents capture and describe this computer's screen, so the " +
    'visual agent can see what you see. Off by default: until you allow ' +
    'it, the agent asks you first. Revoking stops it immediately.',
  enableLabel: allowAllLabel('screen_capture'),
  disableLabel: 'Stop agents seeing this screen',
  confirmTitle: `${allowAllLabel('screen_capture')}?`,
  confirmText:
    'Every agent will be able to capture and describe this screen without ' +
    'asking you first. You can revoke this at any time and it stops ' +
    'immediately.',
  understandLabel: 'I understand every agent can see this screen without asking.',
  confirmLabel: 'Allow',
  enabledMessage: 'Agents may see this screen.',
  disabledMessage: 'Agents can no longer see this screen.',
};

// Agents using the owner's Claude Code subscription as their expert.  When a
// goal's step cannot be finished on the local model and the copilot switch is
// off, the daemon asks the owner through the consent card; Allow turns the
// switch ON, "Don't allow" leaves it off and stands until this card allows it
// again.  Same switch as Admin -> Integrations -> Claude Code.
const COPILOT_ACCESS_CARD = {
  consentType: 'copilot_access',
  Icon: Visibility,
  title: 'Agents using your Claude subscription',
  description:
    "Lets agents hand a step they cannot finish locally to Claude Code, " +
    'using the account the copilot is signed in with. Off by default: ' +
    'until you allow it, an agent asks you first. Revoking switches the ' +
    'copilot off immediately.',
  enableLabel: allowAllLabel('copilot_access'),
  disableLabel: 'Stop agents using your Claude subscription',
  confirmTitle: `${allowAllLabel('copilot_access')}?`,
  confirmText:
    'Every agent will be able to hand hard steps to Claude Code on your ' +
    'subscription without asking you first. You can revoke this at any ' +
    'time and the copilot switches off immediately.',
  understandLabel: 'I understand agents can use my Claude subscription without asking.',
  confirmLabel: 'Allow',
  enabledMessage: 'Agents may use your Claude subscription.',
  disabledMessage: 'Agents can no longer use your Claude subscription.',
};

// Every on/off card on the page.  constants/consentAsks.PRIVACY_CARD_TYPES
// names the ask types that rely on a card here as the way back after a
// "Don't allow": one of these for an agent type, TrustedPhonesCard for
// device_access; PrivacyComputerControlCard.test checks each is here.
const CONSENT_CARDS = [
  PUBLIC_EXPOSURE_CARD,
  COMPUTER_CONTROL_CARD,
  SCREEN_CAPTURE_CARD,
  COPILOT_ACCESS_CARD,
];

export default function PrivacySettingsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null); // {severity, message, retry?}
  const [auditExpanded, setAuditExpanded] = useState(false);

  // Dialog state
  const [grantDialog, setGrantDialog] = useState(null); // scope | null
  const [revokeDialog, setRevokeDialog] = useState(null); // scope | null
  const [actionBusy, setActionBusy] = useState(false);

  const fetchList = useCallback(
    async ({preserveOnError = false} = {}) => {
      setLoading(true);
      setError(null);
      try {
        const res = await consentApi.list({
          consent_type: CLOUD_CAPABILITY_TYPE,
        });
        const data = res?.data?.data || res?.data || {};
        const consents = Array.isArray(data.consents) ? data.consents : [];
        setRows(consents);
      } catch (e) {
        const status = e?.response?.status;
        if (status === 401) {
          // Auth interceptor (axiosFactory) already handles redirect; we
          // just stop showing a stale list.
          if (!preserveOnError) setRows([]);
          setError('You need to sign in to manage consents.');
        } else {
          // Preserve last-known state for sre/graceful-degradation gate.
          setError('Could not load your consents.');
          setSnack({
            severity: 'error',
            message: 'Network error loading consents.',
            retry: true,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // active row for a scope = first row in the newest-first list whose
  // granted=true AND revoked_at is null AND scope matches.
  const activeByScope = useMemo(() => {
    const out = {};
    for (const r of rows) {
      if (!isActive(r)) continue;
      if (out[r.scope]) continue; // first match wins (newest-first server order)
      out[r.scope] = r;
    }
    return out;
  }, [rows]);

  // The newest row per scope (active or revoked) — used to show the
  // "granted X · revoked Y" line for the per-scope row UI.
  const newestByScope = useMemo(() => {
    const out = {};
    for (const r of rows) {
      if (out[r.scope]) continue;
      out[r.scope] = r;
    }
    return out;
  }, [rows]);

  const handleGrantOpen = useCallback((scope) => {
    setGrantDialog(scope);
  }, []);

  const handleRevokeOpen = useCallback((scope) => {
    setRevokeDialog(scope);
  }, []);

  const handleGrantConfirm = useCallback(async () => {
    const scope = grantDialog;
    if (!scope) return;
    setActionBusy(true);
    try {
      await consentApi.grant({
        consent_type: CLOUD_CAPABILITY_TYPE,
        scope,
      });
      setSnack({
        severity: 'success',
        message: `Granted: ${formatScopeLabel(scope)}.`,
      });
      setGrantDialog(null);
      // Mission anchor 2 — refetch so the audit count grows.
      await fetchList();
    } catch (e) {
      setSnack({
        severity: 'error',
        message: 'Could not grant consent. Please retry.',
        retry: true,
      });
    } finally {
      setActionBusy(false);
    }
  }, [grantDialog, fetchList]);

  const handleRevokeConfirm = useCallback(async () => {
    const scope = revokeDialog;
    if (!scope) return;
    setActionBusy(true);
    try {
      await consentApi.revoke({
        consent_type: CLOUD_CAPABILITY_TYPE,
        scope,
      });
      setSnack({
        severity: 'success',
        message: `Revoked: ${formatScopeLabel(scope)}.`,
      });
      setRevokeDialog(null);
      await fetchList();
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        // Defensive — UI usually doesn't show Revoke for inactive rows,
        // but stay graceful if the server says there's nothing to revoke.
        setSnack({
          severity: 'info',
          message: 'No active consent to revoke.',
        });
        setRevokeDialog(null);
        await fetchList();
      } else {
        setSnack({
          severity: 'error',
          message: 'Could not revoke consent. Please retry.',
          retry: true,
        });
      }
    } finally {
      setActionBusy(false);
    }
  }, [revokeDialog, fetchList]);

  const handleSnackClose = () => setSnack(null);
  const handleSnackRetry = async () => {
    setSnack(null);
    await fetchList({preserveOnError: true});
  };

  if (loading && rows.length === 0) {
    return (
      <Box sx={{p: 3, textAlign: 'center'}}>
        <CircularProgress size={24} sx={{color: '#6C63FF'}} />
      </Box>
    );
  }

  const hasAnyConsent = rows.length > 0;

  return (
    <Box sx={{maxWidth: 700, mx: 'auto', p: {xs: 2, md: 3}}}>
      <Typography variant="h5" sx={{color: '#fff', mb: 0.5, fontWeight: 600}}>
        Privacy & cloud capabilities
      </Typography>
      <Typography
        variant="body2"
        sx={{color: 'rgba(255,255,255,0.55)', mb: 3}}
      >
        Choose which features may use cloud-side processing. Granting opt-ins
        is per-capability and reversible — revoking does not erase the audit
        trail.
      </Typography>

      {CONSENT_CARDS.map((card) => (
        <BlanketConsentCard key={card.consentType} {...card} />
      ))}
      {/* device_access: one row per phone, never a blanket
          (constants/consentAsks PRIVACY_CARD_TYPES names it). */}
      <TrustedPhonesCard />

      {error && !snack && (
        <Alert severity="warning" sx={{mb: 2}}>
          {error}
        </Alert>
      )}

      <Paper sx={{...glass, p: 2.5}}>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1.5}}>
          <Cloud sx={{color: '#6C63FF'}} />
          <Typography variant="subtitle1" sx={{color: '#fff', fontWeight: 600}}>
            Cloud capabilities
          </Typography>
        </Box>
        {!hasAnyConsent && (
          <Typography
            variant="body2"
            sx={{color: 'rgba(255,255,255,0.55)', mb: 1}}
            data-testid="empty-state-text"
          >
            No cloud capabilities granted. Some features (like icebreaker
            drafting at central nodes) require explicit consent. Grant them
            when you&apos;re ready.
          </Typography>
        )}
        <Box>
          {GRANTABLE_SCOPES.map((scope) => (
            <ScopeRow
              key={scope}
              scope={scope}
              activeRow={activeByScope[scope] || newestByScope[scope] || null}
              onGrant={handleGrantOpen}
              onRevoke={handleRevokeOpen}
            />
          ))}
        </Box>
      </Paper>

      <AuditHistory
        rows={rows}
        expanded={auditExpanded}
        onToggle={() => setAuditExpanded((v) => !v)}
      />

      <GrantDialog
        open={Boolean(grantDialog)}
        scope={grantDialog}
        onClose={() => setGrantDialog(null)}
        onConfirm={handleGrantConfirm}
        busy={actionBusy}
      />
      <RevokeDialog
        open={Boolean(revokeDialog)}
        scope={revokeDialog}
        onClose={() => setRevokeDialog(null)}
        onConfirm={handleRevokeConfirm}
        busy={actionBusy}
      />

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={snack?.severity === 'error' ? null : 4000}
        onClose={handleSnackClose}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        {snack ? (
          <Alert
            severity={snack.severity}
            onClose={handleSnackClose}
            role="status"
            aria-live="polite"
            action={
              snack.retry ? (
                <Button
                  size="small"
                  onClick={handleSnackRetry}
                  sx={{color: '#fff'}}
                >
                  Retry
                </Button>
              ) : undefined
            }
            sx={{width: '100%'}}
          >
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
