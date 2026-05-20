import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { Box, Typography, Chip, CircularProgress, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip,
  Collapse, Stack, ToggleButton, ToggleButtonGroup, Link } from '@mui/material';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';

const STATUS_COLORS = {
  PENDING: 'default',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  FAILED: 'error',
  BLOCKED: 'warning',
  DELEGATED: 'info',
  DEFERRED: 'default',
};

// Group key derivation — one row in the grouped view = one (agent_id,
// owner_prompt_id) pair, which is the canonical "execution instance"
// identity in agent_ledger.  Tasks with the same pair belong to the
// same conversation/recipe run.  Falls back to 'no-prompt' / 'no-agent'
// for tasks created outside a prompt context (e.g. daemon-injected).
function groupKey(task) {
  const a = task.agent_id || 'no-agent';
  const p = task.owner_prompt_id || 'no-prompt';
  return `${a}__${p}`;
}

function shortId(s) {
  if (!s) return '-';
  return s.length > 12 ? s.slice(0, 8) : s;
}

function statusBreakdown(tasks) {
  const counts = {};
  for (const t of tasks) {
    const s = (t.status || 'UNKNOWN').toUpperCase();
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}


function GroupHeaderRow({ group, expanded, onToggle, highlightId }) {
  const counts = statusBreakdown(group.tasks);
  const inProgress = counts.IN_PROGRESS || 0;
  const blocked = counts.BLOCKED || 0;
  const completed = counts.COMPLETED || 0;
  const failed = counts.FAILED || 0;
  const pending = counts.PENDING || 0;
  const hasHighlight = highlightId && group.tasks.some(
    t => (t.id || t.task_id) === highlightId);
  return (
    <TableRow hover onClick={onToggle}
      sx={{
        cursor: 'pointer',
        bgcolor: hasHighlight
          ? 'rgba(108,99,255,0.15)'
          : 'rgba(108,99,255,0.04)',
        '&:hover': { bgcolor: 'rgba(108,99,255,0.10)' },
        '& td': { borderBottom: '1px solid rgba(108,99,255,0.15)' },
      }}>
      <TableCell padding="checkbox">
        <IconButton size="small">
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
      </TableCell>
      <TableCell colSpan={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{
            fontFamily: 'monospace', fontWeight: 600,
            color: '#6C63FF',
          }}>
            {shortId(group.agent_id)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            prompt={shortId(group.prompt_id)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • {group.tasks.length} task{group.tasks.length === 1 ? '' : 's'}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5}>
          {inProgress > 0 && <Chip size="small" color="primary" label={`▶ ${inProgress}`} sx={{ height: 18 }} />}
          {pending > 0 && <Chip size="small" label={`◌ ${pending}`} sx={{ height: 18 }} />}
          {blocked > 0 && <Chip size="small" color="warning" label={`⛔ ${blocked}`} sx={{ height: 18 }} />}
          {failed > 0 && <Chip size="small" color="error" label={`⚠ ${failed}`} sx={{ height: 18 }} />}
          {completed > 0 && <Chip size="small" color="success" label={`✓ ${completed}`} sx={{ height: 18 }} />}
        </Stack>
      </TableCell>
      <TableCell></TableCell>
      <TableCell>
        <Tooltip title="Open agent drawer">
          <IconButton size="small" component={RouterLink}
            to={`/admin/agents?focus=${group.agent_id}`}
            onClick={(e) => e.stopPropagation()}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}


function TaskRow({ task, isHighlighted, highlightRef }) {
  return (
    <TableRow hover
      ref={isHighlighted ? highlightRef : undefined}
      sx={isHighlighted ? {
        background: 'rgba(108, 99, 255, 0.18) !important',
        outline: '2px solid #6C63FF',
        outlineOffset: '-2px',
        animation: 'taskHighlightPulse 1.4s ease-out 2',
        '@keyframes taskHighlightPulse': {
          '0%, 100%': { background: 'rgba(108, 99, 255, 0.18)' },
          '50%': { background: 'rgba(108, 99, 255, 0.35)' },
        },
      } : undefined}>
      <TableCell></TableCell>
      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.7rem',
        pl: 4, color: 'text.secondary' }}>
        {shortId(task.id || task.task_id)}
        {task.parent_task_id && (
          <Typography component="span" variant="caption" sx={{
            ml: 0.5, color: 'text.secondary', opacity: 0.7,
          }}>
            ↳child
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.3,
        }}>
          {task.title || task.description || '(untitled)'}
        </Typography>
        {task.blocked_reason && (
          <Typography variant="caption" color="warning.main">
            blocked: {task.blocked_reason}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Chip label={task.status || 'UNKNOWN'}
          color={STATUS_COLORS[(task.status || '').toUpperCase()] || 'default'}
          size="small" />
      </TableCell>
      <TableCell sx={{ fontSize: '0.75rem' }}>
        {task.priority || '-'}
      </TableCell>
      <TableCell sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
        {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}
      </TableCell>
    </TableRow>
  );
}


export default function TaskLedgerPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  // 'grouped' (default — by agent+prompt session) | 'flat' (legacy)
  const [viewMode, setViewMode] = useState('grouped');
  // Per-group expanded state.  Default-expand groups that contain
  // IN_PROGRESS or BLOCKED tasks (the ones the operator cares about).
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('task_id');
  const highlightRef = useRef(null);

  const _authHeaders = () => {
    const token = localStorage.getItem('access_token');
    return token ? {Authorization: `Bearer ${token}`} : {};
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // #204 — user reported "top count > grouped count" because the
      // ledger endpoint was hard-capped at 100, but the stats endpoint
      // reports the FULL count.  2502 pending tasks (per recent
      // memory) silently dropped past row 100 in the grouped view.
      // 1000 covers the 90th-percentile case without paging; if the
      // user has more, the discrepancy banner below tells them and
      // a status filter narrows the window.
      const params = statusFilter
        ? `?status=${statusFilter.toLowerCase()}&limit=1000`
        : '?limit=1000';
      const res = await fetch(`/api/agent-engine/ledger/tasks${params}`,
                              {headers: _authHeaders()});
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setTasks(data.tasks || []);
      } else {
        setTasks([]);
        const why = data.error || `HTTP ${res.status}`;
        setErrorMsg(`Ledger unavailable: ${why}`);
      }
    } catch (err) {
      setTasks([]);
      setErrorMsg(`Ledger fetch failed: ${err.message}`);
    }
    setLoading(false);
  }, [statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-engine/ledger/stats',
                              {headers: _authHeaders()});
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) setStats(data.stats);
      else setStats(null);
    } catch { setStats(null); }
  }, []);

  useEffect(() => { fetchTasks(); fetchStats(); }, [fetchTasks, fetchStats]);

  // Group tasks by (agent_id, prompt_id) — derived state, recomputed
  // whenever the task list changes.  Each group also tracks the most
  // recent activity timestamp so we can sort hottest-first.
  const groups = useMemo(() => {
    const byKey = {};
    for (const t of tasks) {
      const k = groupKey(t);
      if (!byKey[k]) {
        byKey[k] = {
          key: k,
          agent_id: t.agent_id || 'no-agent',
          prompt_id: t.owner_prompt_id || 'no-prompt',
          tasks: [],
          mostRecent: 0,
        };
      }
      byKey[k].tasks.push(t);
      const ts = Date.parse(
        t.last_heartbeat_at || t.created_at || ''
      );
      if (!isNaN(ts) && ts > byKey[k].mostRecent) {
        byKey[k].mostRecent = ts;
      }
    }
    // Sort tasks within each group: in_progress first, then by created_at desc.
    const statusRank = (s) => ({
      IN_PROGRESS: 0, BLOCKED: 1, PENDING: 2, FAILED: 3,
      DELEGATED: 4, COMPLETED: 5, DEFERRED: 6,
    }[(s || '').toUpperCase()] ?? 9);
    Object.values(byKey).forEach((g) => {
      g.tasks.sort((a, b) => {
        const sa = statusRank(a.status);
        const sb = statusRank(b.status);
        if (sa !== sb) return sa - sb;
        return Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);
      });
    });
    // Sort groups: those with in_progress first, then by mostRecent desc.
    const arr = Object.values(byKey);
    arr.sort((a, b) => {
      const ai = a.tasks.some(t => (t.status || '').toUpperCase() === 'IN_PROGRESS') ? 0 : 1;
      const bi = b.tasks.some(t => (t.status || '').toUpperCase() === 'IN_PROGRESS') ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return b.mostRecent - a.mostRecent;
    });
    return arr;
  }, [tasks]);

  // Auto-expand groups with in_progress/blocked the first time they
  // appear.  Subsequent re-renders preserve the user's toggle state.
  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = {...prev};
      for (const g of groups) {
        if (next[g.key] === undefined) {
          next[g.key] = g.tasks.some(t => {
            const s = (t.status || '').toUpperCase();
            return s === 'IN_PROGRESS' || s === 'BLOCKED';
          });
        }
      }
      return next;
    });
  }, [groups]);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth', block: 'center',
      });
      // Make sure the group containing the highlighted task is open.
      const g = groups.find(grp => grp.tasks.some(
        t => (t.id || t.task_id) === highlightId));
      if (g) {
        setExpandedGroups((prev) => ({...prev, [g.key]: true}));
      }
    }
  }, [highlightId, tasks, groups]);

  const toggleGroup = (key) => setExpandedGroups(
    (p) => ({...p, [key]: !p[key]}));

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Agent Task Ledger</Typography>
        <ToggleButtonGroup size="small" value={viewMode} exclusive
          onChange={(_, v) => v && setViewMode(v)}>
          <ToggleButton value="grouped" aria-label="Grouped by session">
            <Tooltip title="Group by agent+prompt session">
              <AccountTreeIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="flat" aria-label="Flat list">
            <Tooltip title="Flat task list">
              <ViewListIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {Object.keys(STATUS_COLORS).map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title="Refresh">
          <IconButton onClick={() => { fetchTasks(); fetchStats(); }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {Object.entries(stats).map(([key, val]) => (
            <Paper key={key} sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">{key}</Typography>
              <Typography variant="h6">{typeof val === 'number' ? val : JSON.stringify(val)}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* #204 — surface the discrepancy when the windowed task fetch
          doesn't cover the full ledger.  Top stats are authoritative
          (server-side count); the grouped/flat list below shows only
          what came back in the last fetchTasks call.  Without this
          banner the operator silently thinks "where did my 2000 tasks
          go?" — the bug the user reported. */}
      {stats && typeof stats.total === 'number'
        && tasks.length > 0 && tasks.length < stats.total && (
        <Box sx={{
          mb: 2, px: 2, py: 1,
          background: 'rgba(255, 152, 0, 0.08)',
          borderLeft: '3px solid #FF9800',
          borderRadius: 1,
        }}>
          <Typography variant="caption" sx={{ color: '#FF9800' }}>
            Showing <strong>{tasks.length}</strong> of{' '}
            <strong>{stats.total}</strong> tasks.  Filter by status
            above to narrow the window, or contact ops to raise the
            page size beyond 1000.
          </Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : errorMsg ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="error" sx={{ fontWeight: 600 }}>
            {errorMsg}
          </Typography>
          <Typography color="text.secondary" variant="caption">
            Check the HARTOS server log for details.
          </Typography>
        </Box>
      ) : tasks.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No tasks found. Agent tasks will appear here as they are created.
        </Typography>
      ) : viewMode === 'grouped' ? (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>Task</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => {
                const isExpanded = expandedGroups[group.key] ?? false;
                return (
                  <React.Fragment key={group.key}>
                    <GroupHeaderRow group={group} expanded={isExpanded}
                      onToggle={() => toggleGroup(group.key)}
                      highlightId={highlightId} />
                    {isExpanded && group.tasks.map((task) => {
                      const tid = task.id || task.task_id || '';
                      const isHighlighted = highlightId && tid === highlightId;
                      return (
                        <TaskRow key={tid} task={task}
                          isHighlighted={isHighlighted}
                          highlightRef={highlightRef} />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.map((task) => {
                const tid = task.id || task.task_id || '';
                const isHighlighted = highlightId && tid === highlightId;
                return (
                <TableRow key={tid} hover
                  ref={isHighlighted ? highlightRef : undefined}
                  sx={isHighlighted ? {
                    background: 'rgba(108, 99, 255, 0.18) !important',
                    outline: '2px solid #6C63FF',
                    outlineOffset: '-2px',
                    animation: 'taskHighlightPulse 1.4s ease-out 2',
                    '@keyframes taskHighlightPulse': {
                      '0%, 100%': { background: 'rgba(108, 99, 255, 0.18)' },
                      '50%': { background: 'rgba(108, 99, 255, 0.35)' },
                    },
                  } : undefined}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {tid.slice(0, 8)}
                  </TableCell>
                  <TableCell>{task.title || task.description || '(untitled)'}</TableCell>
                  <TableCell>
                    <Chip label={task.status || 'UNKNOWN'}
                      color={STATUS_COLORS[(task.status || '').toUpperCase()] || 'default'}
                      size="small" />
                  </TableCell>
                  <TableCell>{task.agent_id || task.assigned_to || '-'}</TableCell>
                  <TableCell>{task.priority || '-'}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
