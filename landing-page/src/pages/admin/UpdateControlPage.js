/* eslint-disable */
/**
 * UpdateControlPage — the central "Update Control" panel.
 *
 * Lets the account that owns a fleet publish an OS update to ALL its nodes in
 * one click, then watch the rollout land. It is the operator face of the OTA
 * pipeline that already exists end-to-end:
 *
 *   publish  → POST /api/ota/publish (central-gated)
 *              → FleetCommandService.push_broadcast('firmware_update', …)
 *              → one signed FleetCommand per active PeerNode (Ed25519),
 *                instant via MessageBus 'fleet.command' + durable DB fallback.
 *   pull     → each node's NixOS hart-ota-check timer GETs /api/ota/latest
 *              (and its embedded loop drains the pushed command) — no USB.
 *   apply    → autoApply runs `nixos-rebuild switch` atomically; ack flips the
 *              command pending→delivered(polled)→completed(applied).
 *   observe  → GET /api/ota/nodes maps each node's latest command to a phase.
 *
 * Reuses NetworkNodesPage's API helper shape (apiFetch over otaApi), card /
 * tier / status styling, and Snackbar — this is a sibling admin surface, not a
 * new client or auth path. Account gating is the same central RoleGuard the
 * route wraps it in.
 */
import { otaApi } from '../../services/socialApi';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RefreshIcon from '@mui/icons-material/Refresh';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SyncIcon from '@mui/icons-material/Sync';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import {
  Typography,
  Box,
  Chip,
  Button,
  Skeleton,
  Fade,
  Grow,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Tooltip,
  IconButton,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ── Channels (must mirror the NixOS hart-ota channel enum) ─────────────
const CHANNELS = ['stable', 'testing', 'nightly'];

// ── Rollout phase → color/label/icon ───────────────────────────────────
const ROLLOUT = {
  idle:    { color: '#72757E', label: 'Idle',    icon: <SystemUpdateAltIcon sx={{ fontSize: 14 }} /> },
  queued:  { color: '#FFD700', label: 'Queued',  icon: <HourglassEmptyIcon sx={{ fontSize: 14 }} /> },
  polled:  { color: '#6C63FF', label: 'Pulling', icon: <SyncIcon sx={{ fontSize: 14 }} /> },
  applied: { color: '#00BFA5', label: 'Applied', icon: <DownloadDoneIcon sx={{ fontSize: 14 }} /> },
  failed:  { color: '#FF6B6B', label: 'Failed',  icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} /> },
};

// ── Reusable card style (matches NetworkNodesPage / DashboardPage) ──────
const cardStyle = {
  background: 'linear-gradient(135deg, rgba(26, 23, 48, 0.9) 0%, rgba(15, 14, 23, 0.95) 100%)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 3,
  overflow: 'hidden',
};

const actionButtonStyle = {
  borderRadius: 2,
  textTransform: 'none',
  fontWeight: 600,
  transition: 'all 0.3s ease',
  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
};

function shortHash(h) {
  if (!h) return '--';
  return h.length > 12 ? `${h.slice(0, 12)}…` : h;
}

function formatTs(ts) {
  if (!ts) return '—';
  try {
    // Backend timestamps are epoch seconds (time.time()).
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

// ── Rollout phase chip ──────────────────────────────────────────────────
function RolloutChip({ phase }) {
  const r = ROLLOUT[phase] || ROLLOUT.idle;
  return (
    <Chip
      size="small"
      icon={React.cloneElement(r.icon, { sx: { ...r.icon.props.sx, color: `${r.color} !important` } })}
      label={r.label}
      sx={{
        background: `${r.color}18`,
        color: r.color,
        border: `1px solid ${r.color}40`,
        fontWeight: 600,
        fontSize: '0.72rem',
      }}
    />
  );
}

// ── Rollout summary stat ────────────────────────────────────────────────
function PhaseStat({ phase, count }) {
  const r = ROLLOUT[phase] || ROLLOUT.idle;
  return (
    <Box sx={{ ...cardStyle, flex: 1, minWidth: 110, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{
        width: 38, height: 38, borderRadius: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${r.color}18`,
      }}>
        {React.cloneElement(r.icon, { sx: { fontSize: 18, color: r.color } })}
      </Box>
      <Box>
        <Typography sx={{ color: '#72757E', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {r.label}
        </Typography>
        <Typography sx={{ color: '#E8E6F0', fontSize: '1.3rem', fontWeight: 700 }}>{count}</Typography>
      </Box>
    </Box>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Publish confirmation dialog
// ═════════════════════════════════════════════════════════════════════
function PublishDialog({ open, onClose, onConfirm, channel, commit, flakeRef, nodeCount, loading }) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1A1730 0%, #0F0E17 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          minWidth: 440,
        },
      }}
    >
      <DialogTitle sx={{ color: '#E8E6F0', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <RocketLaunchIcon sx={{ color: '#6C63FF' }} /> Publish to my nodes
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <DialogContentText sx={{ color: '#72757E', fontSize: '0.92rem', mb: 2 }}>
          This sets the <strong style={{ color: '#E8E6F0' }}>{channel}</strong> channel pointer and
          pushes a signed update command to{' '}
          <strong style={{ color: '#E8E6F0' }}>{nodeCount != null ? nodeCount : 'all active'}</strong> node(s).
          Each node auto-pulls on its next poll and applies the update atomically —
          no USB, no per-node command.
        </DialogContentText>
        <Box sx={{ background: 'rgba(0,0,0,0.3)', borderRadius: 2, p: 2, fontFamily: 'monospace', fontSize: '0.82rem' }}>
          <Typography sx={{ color: '#72757E', fontSize: '0.78rem', fontFamily: 'monospace' }}>
            commit&nbsp;&nbsp;&nbsp;<span style={{ color: '#00BFA5' }}>{commit || '(none)'}</span>
          </Typography>
          <Typography sx={{ color: '#72757E', fontSize: '0.78rem', fontFamily: 'monospace', mt: 0.5 }}>
            flake_ref <span style={{ color: '#6C63FF' }}>{flakeRef || '(channel default)'}</span>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: '#72757E', textTransform: 'none' }}>Cancel</Button>
        <Button
          onClick={onConfirm}
          disabled={loading || !commit}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <CloudUploadIcon sx={{ fontSize: 18 }} />}
          sx={{
            ...actionButtonStyle,
            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.2) 0%, rgba(155, 148, 255, 0.2) 100%)',
            color: '#6C63FF',
            border: '1px solid rgba(108, 99, 255, 0.35)',
          }}
        >
          {loading ? 'Publishing…' : 'Publish'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════
export default function UpdateControlPage() {
  const [channel, setChannel] = useState('stable');
  const [latest, setLatest] = useState(null);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [checkingLatest, setCheckingLatest] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [counts, setCounts] = useState({});
  const [loadingNodes, setLoadingNodes] = useState(true);

  // Publish form
  const [commitInput, setCommitInput] = useState('');
  const [flakeInput, setFlakeInput] = useState('');
  const [publishDialog, setPublishDialog] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // ── Fetch the current published pointer for the selected channel ──
  const fetchLatest = useCallback(async () => {
    setLoadingLatest(true);
    try {
      const data = await otaApi.latest(channel);
      setLatest(data || null);
    } catch (err) {
      showSnackbar(`Failed to load latest: ${err?.message || err}`, 'error');
      setLatest(null);
    }
    setLoadingLatest(false);
  }, [channel, showSnackbar]);

  // ── "Check for updates" — the on-demand poll a node does ──
  // Reuses otaApi.latest (no parallel client/path): GETs /api/ota/latest for the
  // selected channel exactly as the NixOS hart-ota-check timer does, on operator
  // demand instead of on a schedule. Reports the current approved pointer (or
  // "nothing published") so the operator sees what every node would pull next.
  const handleCheckForUpdates = useCallback(async () => {
    setCheckingLatest(true);
    try {
      const data = await otaApi.latest(channel);
      setLatest(data || null);
      if (data && data.commit) {
        showSnackbar(`Latest on ${channel}: ${shortHash(data.commit)} — nodes pull this on their next poll`, 'success');
      } else {
        showSnackbar(`Nothing published on ${channel} yet — nodes hold their current generation`, 'info');
      }
    } catch (err) {
      showSnackbar(`Check failed: ${err?.error || err?.message || err}`, 'error');
    }
    setCheckingLatest(false);
  }, [channel, showSnackbar]);

  // ── Fetch the live per-node rollout view ──
  const fetchNodes = useCallback(async () => {
    try {
      const data = await otaApi.nodes(channel);
      setNodes(data?.nodes || []);
      setCounts(data?.counts || {});
    } catch (err) {
      showSnackbar(`Failed to load nodes: ${err?.message || err}`, 'error');
    }
    setLoadingNodes(false);
  }, [channel, showSnackbar]);

  // Reload both when the channel changes.
  useEffect(() => { fetchLatest(); }, [fetchLatest]);
  useEffect(() => { setLoadingNodes(true); fetchNodes(); }, [fetchNodes]);

  // Auto-refresh the rollout view so the operator watches nodes land live.
  useEffect(() => {
    const interval = setInterval(fetchNodes, 15000);
    return () => clearInterval(interval);
  }, [fetchNodes]);

  // ── Publish ──
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const result = await otaApi.publish({
        channel,
        commit: commitInput.trim(),
        flake_ref: flakeInput.trim(),
      });
      setPublishDialog(false);
      showSnackbar(
        `Published ${shortHash(result.commit)} to ${result.node_count} node(s) on ${channel}`,
        'success',
      );
      // Pointer + rollout both change immediately after a publish.
      fetchLatest();
      setLoadingNodes(true);
      fetchNodes();
    } catch (err) {
      showSnackbar(`Publish failed: ${err?.error || err?.message || err}`, 'error');
    }
    setPublishing(false);
  };

  const orderedPhases = useMemo(
    () => ['queued', 'polled', 'applied', 'failed', 'idle'].filter((p) => (counts[p] || 0) >= 0),
    [counts],
  );

  return (
    <Fade in timeout={300}>
      <Box>
        {/* ── Header ── */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.15) 0%, rgba(155, 148, 255, 0.15) 100%)',
            }}>
              <SystemUpdateAltIcon sx={{
                fontSize: 24,
                background: 'linear-gradient(135deg, #6C63FF 0%, #9B94FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Update Control
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Publish an OS update to every node on your account. Nodes auto-pull and
                auto-apply on their next poll — no USB, no manual command.
              </Typography>
            </Box>
            <Tooltip title="Refresh now" arrow>
              <IconButton
                onClick={() => { fetchLatest(); setLoadingNodes(true); fetchNodes(); }}
                sx={{ color: '#6C63FF', '&:hover': { background: 'rgba(108, 99, 255, 0.1)' } }}
                aria-label="Refresh update control"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Channel selector ── */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ color: '#72757E', fontSize: '0.85rem', fontWeight: 500 }}>Channel</Typography>
          <ToggleButtonGroup
            value={channel}
            exclusive
            onChange={(_, v) => { if (v) setChannel(v); }}
            size="small"
            data-testid="ota-channel-selector"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#72757E',
                textTransform: 'none',
                borderColor: 'rgba(255,255,255,0.1)',
                px: 2,
                '&.Mui-selected': {
                  color: '#6C63FF',
                  background: 'rgba(108, 99, 255, 0.12)',
                  borderColor: 'rgba(108, 99, 255, 0.3)',
                  '&:hover': { background: 'rgba(108, 99, 255, 0.18)' },
                },
              },
            }}
          >
            {CHANNELS.map((c) => (
              <ToggleButton key={c} value={c}>{c}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* ── Current latest (per channel) ── */}
        <Grow in timeout={400}>
          <Box sx={{ ...cardStyle, mb: 3 }} data-testid="ota-latest-card">
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2,
              borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(108, 99, 255, 0.04)',
            }}>
              <DownloadDoneIcon sx={{ fontSize: 20, color: '#00BFA5' }} />
              <Typography sx={{ color: '#E8E6F0', fontWeight: 600, fontSize: '0.95rem', flex: 1 }}>
                Currently published on <span style={{ color: '#6C63FF' }}>{channel}</span>
              </Typography>
              <Tooltip title="Poll /api/ota/latest now — the same on-demand check a node runs on boot" arrow>
                <span>
                  <Button
                    size="small"
                    onClick={handleCheckForUpdates}
                    disabled={checkingLatest}
                    data-testid="ota-check-button"
                    startIcon={checkingLatest
                      ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                      : <SyncIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      ...actionButtonStyle,
                      color: '#6C63FF',
                      border: '1px solid rgba(108, 99, 255, 0.3)',
                      background: 'rgba(108, 99, 255, 0.08)',
                      '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    {checkingLatest ? 'Checking…' : 'Check for updates'}
                  </Button>
                </span>
              </Tooltip>
            </Box>
            <Box sx={{ px: 3, py: 2.5 }}>
              {loadingLatest ? (
                <Skeleton width={320} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
              ) : latest && latest.commit ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography sx={{ color: '#72757E', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Commit</Typography>
                    <Tooltip title={latest.commit} arrow>
                      <Typography sx={{ color: '#00BFA5', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 600 }}>
                        {shortHash(latest.commit)}
                      </Typography>
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <Typography sx={{ color: '#72757E', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Flake ref</Typography>
                    <Typography sx={{ color: '#E8E6F0', fontFamily: 'monospace', fontSize: '0.88rem', wordBreak: 'break-all' }}>
                      {latest.flake_ref || '(channel default)'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography sx={{ color: '#72757E', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Published</Typography>
                    <Typography sx={{ color: '#E8E6F0', fontSize: '0.88rem' }}>{formatTs(latest.published_at)}</Typography>
                  </Grid>
                </Grid>
              ) : (
                <Typography sx={{ color: '#72757E', fontSize: '0.9rem' }}>
                  Nothing published on <strong style={{ color: '#E8E6F0' }}>{channel}</strong> yet.
                  Nodes on this channel hold at their current generation until you publish.
                </Typography>
              )}
            </Box>
          </Box>
        </Grow>

        {/* ── Publish form ── */}
        <Grow in timeout={500}>
          <Box sx={{ ...cardStyle, mb: 3 }} data-testid="ota-publish-card">
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2,
              borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(108, 99, 255, 0.04)',
            }}>
              <RocketLaunchIcon sx={{ fontSize: 20, color: '#6C63FF' }} />
              <Typography sx={{ color: '#E8E6F0', fontWeight: 600, fontSize: '0.95rem', flex: 1 }}>
                Publish a new update
              </Typography>
            </Box>
            <Box sx={{ px: 3, py: 2.5 }}>
              <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth size="small"
                    label="Commit / release hash"
                    placeholder="e.g. 74ab507… (required)"
                    value={commitInput}
                    onChange={(e) => setCommitInput(e.target.value)}
                    autoComplete="off"
                    inputProps={{ spellCheck: false }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(0,0,0,0.3)', borderRadius: 2, fontFamily: 'monospace', fontSize: '0.85rem',
                        '& fieldset': { borderColor: 'rgba(108, 99, 255, 0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(108, 99, 255, 0.4)' },
                        '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
                      },
                      '& .MuiInputBase-input': { color: '#E8E6F0' },
                      '& .MuiInputLabel-root': { color: '#72757E' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#6C63FF' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth size="small"
                    label="Flake ref (optional)"
                    placeholder="github:hertz-ai/HARTOS/<sha>"
                    value={flakeInput}
                    onChange={(e) => setFlakeInput(e.target.value)}
                    autoComplete="off"
                    inputProps={{ spellCheck: false }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(0,0,0,0.3)', borderRadius: 2, fontFamily: 'monospace', fontSize: '0.85rem',
                        '& fieldset': { borderColor: 'rgba(108, 99, 255, 0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(108, 99, 255, 0.4)' },
                        '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
                      },
                      '& .MuiInputBase-input': { color: '#E8E6F0' },
                      '& .MuiInputLabel-root': { color: '#72757E' },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#6C63FF' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    onClick={() => setPublishDialog(true)}
                    disabled={!commitInput.trim()}
                    startIcon={<CloudUploadIcon sx={{ fontSize: 18 }} />}
                    data-testid="ota-publish-button"
                    sx={{
                      ...actionButtonStyle,
                      height: 40,
                      background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.2) 0%, rgba(155, 148, 255, 0.2) 100%)',
                      color: '#6C63FF',
                      border: '1px solid rgba(108, 99, 255, 0.35)',
                      '&.Mui-disabled': { color: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.05)' },
                    }}
                  >
                    Publish
                  </Button>
                </Grid>
              </Grid>
              <Typography sx={{ color: '#72757E', fontSize: '0.74rem', mt: 1.5 }}>
                Publishing to <strong style={{ color: '#E8E6F0' }}>{channel}</strong> signs and pushes a
                firmware_update command to every active node. Leave flake ref blank to use the
                channel's default repo.
              </Typography>
            </Box>
          </Box>
        </Grow>

        {/* ── Rollout summary ── */}
        <Grow in={!loadingNodes} timeout={500}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {orderedPhases.map((p) => (
              <Grid item xs={6} sm={4} md={2.4} key={p}>
                <PhaseStat phase={p} count={counts[p] || 0} />
              </Grid>
            ))}
          </Grid>
        </Grow>

        {/* ── Live node rollout table ── */}
        <Grow in timeout={600}>
          <Box sx={cardStyle} data-testid="ota-nodes-card">
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <SyncIcon sx={{ fontSize: 20, color: '#6C63FF' }} />
              <Typography sx={{ color: '#E8E6F0', fontWeight: 600, fontSize: '0.95rem', flex: 1 }}>
                Node rollout {channel ? `(${channel})` : ''}
              </Typography>
              <Typography sx={{ color: '#72757E', fontSize: '0.75rem' }}>auto-refreshes every 15s</Typography>
            </Box>
            {loadingNodes ? (
              <Box sx={{ p: 2 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                    <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="50%" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                    </Box>
                    <Skeleton variant="rounded" width={80} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                  </Box>
                ))}
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{
                    background: 'rgba(108, 99, 255, 0.05)',
                    '& th': { color: 'rgba(255,255,255,0.7)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)', py: 2, whiteSpace: 'nowrap' },
                  }}>
                    <TableCell>Node</TableCell>
                    <TableCell>Tier</TableCell>
                    <TableCell>Rollout</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell>Pulled</TableCell>
                    <TableCell>Applied</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nodes.map((node, index) => {
                    const tag = node.hart_tag || node.name || node.node_id;
                    return (
                      <Fade in timeout={300 + index * 40} key={node.node_id || index}>
                        <TableRow sx={{
                          transition: 'all 0.3s ease',
                          '&:hover': { background: 'rgba(108, 99, 255, 0.05)' },
                          '& td': { color: '#E8E6F0', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.5 },
                        }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6C63FF 0%, #9B94FF 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.8rem', fontWeight: 600, color: '#fff',
                              }}>
                                {(tag || 'N')[0].toUpperCase()}
                              </Box>
                              <Box>
                                <Typography sx={{ fontWeight: 500, fontSize: '0.88rem', lineHeight: 1.2 }}>
                                  {String(tag).startsWith('@') ? tag : `@${tag}`}
                                </Typography>
                                <Typography sx={{ color: '#72757E', fontSize: '0.7rem' }}>
                                  {node.version ? `v${node.version}` : node.status}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.82rem', color: '#72757E' }}>{node.tier || 'flat'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={node.result_message || ''} arrow disableHoverListener={!node.result_message}>
                              <span><RolloutChip phase={node.rollout} /></span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={node.target_commit || ''} arrow disableHoverListener={!node.target_commit}>
                              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: node.target_commit ? '#E8E6F0' : '#72757E' }}>
                                {shortHash(node.target_commit)}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.78rem', color: '#72757E', whiteSpace: 'nowrap' }}>{formatTs(node.polled_at)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.78rem', color: node.applied_at ? '#00BFA5' : '#72757E', whiteSpace: 'nowrap' }}>
                              {formatTs(node.applied_at)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </Fade>
                    );
                  })}
                  {nodes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <CheckCircleIcon sx={{ fontSize: 44, color: 'rgba(255,255,255,0.15)', mb: 1.5 }} />
                        <Typography sx={{ color: '#72757E' }}>No nodes on this account yet</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Box>
        </Grow>

        {/* ── Publish confirm dialog ── */}
        <PublishDialog
          open={publishDialog}
          onClose={() => setPublishDialog(false)}
          onConfirm={handlePublish}
          channel={channel}
          commit={commitInput.trim()}
          flakeRef={flakeInput.trim()}
          nodeCount={nodes.length || null}
          loading={publishing}
        />

        {/* ── Snackbar ── */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            severity={snackbar.severity}
            variant="filled"
            sx={{
              borderRadius: 2,
              fontWeight: 500,
              ...(snackbar.severity === 'success' && {
                background: 'linear-gradient(135deg, #6C63FF 0%, #9B94FF 100%)',
              }),
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
}
