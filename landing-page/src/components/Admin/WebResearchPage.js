/* eslint-disable */
/**
 * WebResearchPage — admin surface for the T2 browser-research subsystem.
 *
 * Sibling to /admin/channels but for a different tier:
 *   /admin/channels      → T1 real-time messaging (bot/websocket adapters)
 *   /admin/web-research  → T2 read/post-as-user via Obscura browser driver
 *                          (B2 attaches to user's Chrome via CDP at :9222;
 *                           B1 falls back to a managed headless profile)
 *
 * Shows:
 *  - Driver health (B2 reachable? which mode would be selected right now?)
 *  - Configured platforms (vault entries)  + revoke
 *  - Registered tools (introspection from core/agent_tools.py)
 *  - Recent audit-log entries (newest last) with connection_mechanism per row
 *
 * Reuses the existing AdminLayout chrome, RoleGuard, and Liquid UI cards.
 * No parallel admin surface.
 */
import React, {useEffect, useState, useCallback} from 'react';
import {webResearchApi} from '../../services/socialApi';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Skeleton,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import StorageIcon from '@mui/icons-material/Storage';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const MODE_LABEL = {
  b2: 'B2 — attached to your Chrome',
  b1: 'B1 — managed headless profile',
};

const MECH_COLOR = {
  obscura_b2_cdp_user_chrome: '#10b981',  // green — best (human-like)
  obscura_b1_headless_profile: '#6C63FF', // purple — fallback
  public_http: '#888',                    // grey — T3 no-auth
  blocked: '#ff4444',
  error: '#ff4444',
  unavailable: '#ff8800',
};

function formatTs(ts) {
  if (!ts) return '';
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function WebResearchPage() {
  const [probe, setProbe] = useState(null);
  const [tools, setTools] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, t, v, a] = await Promise.all([
        webResearchApi.probe().catch((e) => ({data: {ok: false, error: e?.message}})),
        webResearchApi.listTools().catch(() => ({data: {ok: false, tools: []}})),
        webResearchApi.listVault().catch(() => ({data: {ok: false, platforms: []}})),
        webResearchApi.audit(50).catch(() => ({data: {ok: false, records: []}})),
      ]);
      setProbe(p?.data || null);
      setTools(t?.data?.tools || []);
      setPlatforms(v?.data?.platforms || []);
      setAudit(a?.data?.records || []);
    } catch (e) {
      setError(e?.message || 'failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const revoke = async (platform) => {
    if (!window.confirm(`Revoke all stored credentials for ${platform}?`)) return;
    try {
      await webResearchApi.revokePlatform(platform);
      await refresh();
    } catch (e) {
      setError(`Revoke failed: ${e?.message || e}`);
    }
  };

  return (
    <Box sx={{p: 3}}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
        <Box>
          <Typography variant="h4" sx={{fontWeight: 700, mb: 0.5}}>Web Research</Typography>
          <Typography variant="body2" sx={{opacity: 0.7}}>
            T2 read/post-as-user via your browser session. Complements the messaging
            channels in <code>/admin/channels</code> — does not replace them.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={refresh} aria-label="Refresh web research status"><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{mb: 2}} onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* Driver health */}
      <Card sx={{mb: 3}} data-testid="wr-driver-card">
        <CardContent>
          <Typography variant="h6" sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 2}}>
            <OpenInBrowserIcon fontSize="small" /> Driver Status
          </Typography>
          {loading && !probe ? (
            <Skeleton width={300} />
          ) : probe?.ok ? (
            <Box>
              <Box sx={{display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap'}}>
                <Chip
                  label={MODE_LABEL[probe.effective_mode] || probe.effective_mode}
                  sx={{
                    bgcolor: MECH_COLOR[probe.connection_mechanism] || '#888',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                  data-testid="wr-effective-mode"
                />
                <Chip
                  label={probe.b2_cdp_reachable ? 'Chrome CDP reachable' : 'Chrome CDP unreachable'}
                  variant="outlined"
                  color={probe.b2_cdp_reachable ? 'success' : 'default'}
                />
              </Box>
              {!probe.b2_cdp_reachable && (
                <Alert severity="info" sx={{mt: 1}}>
                  Start Chrome with <code>--remote-debugging-port=9222</code> to enable
                  B2 mode (agent attaches to your existing logged-in tabs).
                </Alert>
              )}
            </Box>
          ) : (
            <Alert severity="warning">Driver probe unavailable: {probe?.error || 'unknown error'}</Alert>
          )}
        </CardContent>
      </Card>

      {/* Configured platforms */}
      <Card sx={{mb: 3}} data-testid="wr-vault-card">
        <CardContent>
          <Typography variant="h6" sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 2}}>
            <VerifiedUserIcon fontSize="small" /> Configured Platforms
          </Typography>
          {loading && platforms.length === 0 ? (
            <Skeleton variant="rectangular" height={60} />
          ) : platforms.length === 0 ? (
            <Typography variant="body2" sx={{opacity: 0.7}}>
              No T2 platforms configured yet. The first platform lands in C4 (Twitter via cookie session).
            </Typography>
          ) : (
            <Grid container spacing={1.5}>
              {platforms.map((p) => (
                <Grid item key={p}>
                  <Chip
                    label={p}
                    onDelete={() => revoke(p)}
                    deleteIcon={<DeleteIcon />}
                    sx={{bgcolor: 'rgba(108,99,255,0.18)', color: '#cfcaff', fontWeight: 600}}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Registered tools */}
      <Card sx={{mb: 3}} data-testid="wr-tools-card">
        <CardContent>
          <Typography variant="h6" sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 2}}>
            <StorageIcon fontSize="small" /> Registered Tools
          </Typography>
          {loading && tools.length === 0 ? (
            <Skeleton variant="rectangular" height={60} />
          ) : tools.length === 0 ? (
            <Typography variant="body2" sx={{opacity: 0.7}}>No tools registered.</Typography>
          ) : (
            <Grid container spacing={1.5}>
              {tools.map((t) => (
                <Grid item key={t.name}>
                  <Chip
                    label={`${t.name} → ${t.script}.${t.action}`}
                    variant="outlined"
                    sx={{fontFamily: 'monospace'}}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card data-testid="wr-audit-card">
        <CardContent>
          <Typography variant="h6" sx={{mb: 2}}>Recent Activity (last 50)</Typography>
          {loading && audit.length === 0 ? (
            <Skeleton variant="rectangular" height={120} />
          ) : audit.length === 0 ? (
            <Typography variant="body2" sx={{opacity: 0.7}}>
              No activity yet. The agent's first browser-research call will appear here with
              its connection mechanism (which path was used to access the resource).
            </Typography>
          ) : (
            <Paper variant="outlined" sx={{overflow: 'auto', maxHeight: 400}}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Tool</TableCell>
                    <TableCell>Platform</TableCell>
                    <TableCell>How</TableCell>
                    <TableCell>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {audit.slice().reverse().map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{whiteSpace: 'nowrap'}}>{formatTs(r.ts)}</TableCell>
                      <TableCell sx={{fontFamily: 'monospace'}}>{r.tool}</TableCell>
                      <TableCell>{r.platform}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.connection_mechanism || 'unknown'}
                          size="small"
                          sx={{
                            bgcolor: MECH_COLOR[r.connection_mechanism] || '#666',
                            color: '#fff',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {r.success ? (
                          <Chip label="ok" size="small" color="success" />
                        ) : (
                          <Chip label="fail" size="small" color="error" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
