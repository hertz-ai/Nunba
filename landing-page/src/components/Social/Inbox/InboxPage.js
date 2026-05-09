/**
 * InboxPage — flagship unified inbox (Nunba web/desktop).
 *
 * Mirrors the RN/iOS InboxScreen contract: same /api/social/sync/inbox
 * payload, same routing dispatch table, same provenance-color
 * vocabulary.  MUI implementation for browser/desktop ergonomics.
 *
 * UI lineage matches the mobile arc:
 *   - LinkedIn  → compact row card with avatar | body | trailing time
 *   - Instagram → pulsing unread dot
 *   - Reddit    → filter chip rail + EmptyState
 *   - Discord   → provenance pill ("via Discord", "in #cosmic-tea-club")
 */
import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  Skeleton,
  keyframes,
  useTheme,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import {inboxApi} from '../../../services/socialApi';

/* ── Provenance color map (mirrors theme/colors.js PROVENANCE_COLORS) ── */
const PROVENANCE_COLORS = {
  discord:   '#5865F2',
  whatsapp:  '#25D366',
  slack:     '#4A154B',
  matrix:    '#0DBD8B',
  teams:     '#6264A7',
  telegram:  '#26A5E4',
  email:     '#888888',
  livekit:   '#3CB54E',
  hevolve:   '#6C63FF',
  nunba:     '#6C63FF',
  hevolveai: '#6C63FF',
  default:   '#888888',
};
const PLATFORM_LABELS = {
  discord:   'Discord',   whatsapp:  'WhatsApp',  slack:     'Slack',
  matrix:    'Matrix',    teams:     'Teams',     telegram:  'Telegram',
  email:     'Email',     livekit:   'Live call', hevolve:   'Nunba',
  nunba:     'Nunba',     hevolveai: 'Nunba',
};
const platformOf = (channelType) => {
  if (!channelType || typeof channelType !== 'string') return null;
  return channelType.split(':')[0].toLowerCase();
};
const platformColor = (channelType) => {
  const p = platformOf(channelType);
  return (p && PROVENANCE_COLORS[p]) || PROVENANCE_COLORS.default;
};

/* ── Filter taxonomy (matches RN/iOS FilterChips items) ────────── */
const FILTERS = [
  {value: 'all',          label: 'All',      kinds: null},
  {value: 'mention',      label: 'Mentions', kinds: ['mention']},
  {value: 'message',      label: 'Messages', kinds: ['message']},
  {value: 'invite',       label: 'Invites',  kinds: ['invite']},
  {value: 'friendship',   label: 'Friends',  kinds: ['friendship']},
  {value: 'notification', label: 'Other',    kinds: ['notification']},
];

/* ── Routing dispatch (mirrors RN routeForRow) ─────────────────── */
export const routeForRow = (row) => {
  if (!row) return null;
  if (row.deep_link && typeof row.deep_link === 'string') {
    return {kind: 'href', value: row.deep_link};
  }
  switch (row.kind) {
    case 'message':
      return {kind: 'path', value: `/social/conversations/${row.parent_id}`};
    case 'mention':
      if (row.parent_kind === 'post' || row.parent_kind === 'comment') {
        return {kind: 'path', value: `/social/posts/${row.parent_id}`};
      }
      if (row.parent_kind === 'community') {
        return {kind: 'path', value: `/social/communities/${row.parent_id}`};
      }
      return null;
    case 'invite':      return {kind: 'path', value: '/social/invites'};
    case 'friendship':  return {kind: 'path', value: '/social/friends'};
    case 'notification':
    default:            return {kind: 'path', value: '/social/notifications'};
  }
};

/* ── Helpers ──────────────────────────────────────────────────── */
const senderName = (row) => {
  const s = row.sender || {};
  return s.display_name || s.username ||
         row.sender_name || row.sender_username || 'Someone';
};
const senderUri = (row) => {
  const s = row.sender || {};
  return s.avatar_url || row.sender_avatar_url || null;
};
const senderInitials = (row) => {
  const n = senderName(row);
  return n.split(/\s+/).slice(0, 2)
    .map((p) => p[0] || '').join('').toUpperCase() || '?';
};
const isAgent = (row) =>
  (row.sender && row.sender.user_type === 'agent') ||
  row.sender_kind === 'agent';
const ago = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60)     return `${sec}s`;
  if (sec < 3600)   return `${Math.floor(sec / 60)}m`;
  if (sec < 86400)  return `${Math.floor(sec / 3600)}h`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
  return new Date(t).toLocaleDateString();
};

/* ── Pulse keyframe (Instagram-style unread dot) ──────────────── */
const unreadPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(108,99,255,0.5); }
  50%      { box-shadow: 0 0 0 6px rgba(108,99,255,0); }
`;

/* ── Single row ───────────────────────────────────────────────── */
const InboxRow = ({row, onClick}) => {
  const theme = useTheme();
  const platform = platformOf(row.channel_type);
  const chipColor = platformColor(row.channel_type);
  const chipLabel = row.parent_label
    || (platform && PLATFORM_LABELS[platform])
    || (platform ? platform[0].toUpperCase() + platform.slice(1) : null);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-start"
      onClick={onClick}
      sx={{
        px: 2, py: 1.25,
        cursor: 'pointer',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        '&:hover': {bgcolor: alpha(theme.palette.action.hover, 0.6)},
      }}
    >
      <Box sx={{width: 12, mt: 1.25, flexShrink: 0}}>
        {row.is_unread ? (
          <Box
            sx={{
              width: 8, height: 8, borderRadius: '50%',
              bgcolor: '#6C63FF',
              animation: `${unreadPulse} 1.5s ease-out infinite`,
            }}
          />
        ) : null}
      </Box>
      <Box sx={{position: 'relative', flexShrink: 0}}>
        <Avatar
          src={senderUri(row) || undefined}
          sx={{width: 44, height: 44, bgcolor: chipColor + '33', color: chipColor, fontWeight: 700}}
        >
          {senderInitials(row)}
        </Avatar>
        {isAgent(row) ? (
          <Box
            sx={{
              position: 'absolute',
              right: -2, bottom: -2,
              width: 16, height: 16, borderRadius: '50%',
              bgcolor: '#6C63FF',
              border: `2px solid ${theme.palette.background.default}`,
              fontSize: 10,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Agent"
          >
            🤖
          </Box>
        ) : null}
      </Box>
      <Box sx={{flex: 1, minWidth: 0}}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" noWrap sx={{fontWeight: 700}}>
            {senderName(row)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {ago(row.last_activity_at)}
          </Typography>
        </Stack>
        {row.content_preview ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mt: 0.25,
            }}
          >
            {row.content_preview}
          </Typography>
        ) : null}
        {chipLabel ? (
          <Chip
            size="small"
            label={chipLabel}
            sx={{
              mt: 0.75,
              height: 22,
              fontSize: 11,
              fontWeight: 600,
              borderColor: chipColor,
              color: chipColor,
              bgcolor: alpha(chipColor, 0.13),
              '& .MuiChip-label': {px: 1},
            }}
            variant="outlined"
          />
        ) : null}
      </Box>
    </Stack>
  );
};

/* ── Page ─────────────────────────────────────────────────────── */
export default function InboxPage() {
  const navigate = useNavigate();
  const [rows, setRows]               = useState([]);
  const [cursor, setCursor]           = useState(null);
  const [hasMore, setHasMore]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');

  const load = useCallback(async ({since} = {}) => {
    try {
      const res = await inboxApi.list(since ? {since, limit: 50} : {limit: 50});
      const data = (res && res.data) || res || {};
      return {
        rows: Array.isArray(data.rows) ? data.rows : [],
        cursor: data.cursor || null,
        hasMore: Boolean(data.has_more),
      };
    } catch (_e) {
      return {rows: [], cursor: null, hasMore: false};
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out = await load();
      if (cancelled) return;
      setRows(out.rows);
      setCursor(out.cursor);
      setHasMore(out.hasMore);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const out = await load();
    setRows(out.rows);
    setCursor(out.cursor);
    setHasMore(out.hasMore);
    setRefreshing(false);
  }, [load]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    const out = await load({since: cursor});
    setRows((prev) => prev.concat(out.rows));
    setCursor(out.cursor);
    setHasMore(out.hasMore);
    setLoadingMore(false);
  }, [hasMore, loadingMore, cursor, load]);

  /* Filter + search */
  const filtered = useMemo(() => {
    const def = FILTERS.find((f) => f.value === filter) || FILTERS[0];
    let out = def.kinds == null ? rows
      : rows.filter((r) => def.kinds.includes(r.kind));
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) =>
        (senderName(r) || '').toLowerCase().includes(q) ||
        (r.content_preview || '').toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, filter, search]);

  /* Per-filter unread badges */
  const filterCounts = useMemo(() => {
    const out = {};
    for (const f of FILTERS) {
      let n = 0;
      for (const r of rows) {
        if (!r.is_unread) continue;
        if (f.kinds == null || f.kinds.includes(r.kind)) n += 1;
      }
      out[f.value] = n;
    }
    return out;
  }, [rows]);

  /* Click → navigate */
  const handleRowClick = useCallback((row) => {
    const target = routeForRow(row);
    if (!target) return;
    if (target.kind === 'href') {
      // Prefer in-app routing for local hrefs; for external schemes
      // we fall back to the browser's native handler.
      if (target.value.startsWith('/')) navigate(target.value);
      else window.location.href = target.value;
      return;
    }
    if (target.kind === 'path') navigate(target.value);
  }, [navigate]);

  return (
    <Box sx={{maxWidth: 720, mx: 'auto', py: 3, px: {xs: 1, sm: 2}}}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 2}}>
        <InboxIcon sx={{color: '#6C63FF'}} />
        <Typography variant="h5" sx={{fontWeight: 700, flex: 1}}>
          Inbox
        </Typography>
        <IconButton
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh inbox"
        >
          {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
        </IconButton>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="Search inbox…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: search ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearch('')}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
        sx={{mb: 1.5}}
      />

      <Stack direction="row" spacing={1} sx={{mb: 2, overflowX: 'auto'}}>
        {FILTERS.map((f) => {
          const count = filterCounts[f.value] || 0;
          const active = f.value === filter;
          return (
            <Chip
              key={f.value}
              clickable
              onClick={() => setFilter(f.value)}
              label={
                count > 0
                  ? `${f.label} · ${count > 99 ? '99+' : count}`
                  : f.label
              }
              color={active ? 'primary' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              sx={{flexShrink: 0}}
            />
          );
        })}
      </Stack>

      {loading ? (
        <Box>
          {[...Array(6)].map((_, i) => (
            <Stack key={i} direction="row" spacing={2} sx={{p: 2, alignItems: 'center'}}>
              <Skeleton variant="circular" width={44} height={44} />
              <Box sx={{flex: 1}}>
                <Skeleton variant="text" width="55%" />
                <Skeleton variant="text" width="85%" />
              </Box>
            </Stack>
          ))}
        </Box>
      ) : filtered.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: 'text.secondary',
          }}
        >
          <InboxIcon sx={{fontSize: 64, opacity: 0.4, mb: 1}} />
          <Typography variant="h6" color="text.primary" sx={{mb: 1}}>
            {filter === 'all' ? 'Inbox zero' : 'Nothing here'}
          </Typography>
          <Typography variant="body2">
            {filter === 'all'
              ? 'New mentions, messages, and invites will land here.'
              : 'Try a different filter or refresh.'}
          </Typography>
        </Box>
      ) : (
        <Box>
          {filtered.map((row) => (
            <InboxRow
              key={row.id}
              row={row}
              onClick={() => handleRowClick(row)}
            />
          ))}
          {hasMore ? (
            <Box sx={{textAlign: 'center', py: 2}}>
              <IconButton
                onClick={fetchMore}
                disabled={loadingMore}
                aria-label="Load more"
              >
                {loadingMore
                  ? <CircularProgress size={20} />
                  : <RefreshIcon />}
              </IconButton>
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
