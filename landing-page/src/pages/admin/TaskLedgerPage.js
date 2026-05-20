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

// #204 / #220 — resolve flow + action identifiers.
//
// Preferred source (#220, no schema migration): the backend ledger's
// pre_assign_actions() at agent-ledger-opensource/agent_ledger/core.py:3559
// writes context = {action_id, flow, persona} on every action task.
// We read those FIRST so the UI uses the canonical values the backend
// stamped, not a regex over description text.
//
// Fallback (#204, for legacy rows + daemon-injected tasks): if context
// is absent or doesn't carry these keys, parse the description string
// for the conventional recipe prefix patterns:
//   "Flow N / Action M"
//   "Execute Action N: ..."
//   "Action N"
// When no signal is recoverable, the task lands in a synthetic
// "flow=- / action=-" bucket so it still groups under its prompt.
function parseFlowAction(task) {
  // (a) Backend-stamped context wins.
  const ctx = task.context || task.context_json || {};
  if (ctx.action_id != null || ctx.flow != null) {
    const flow = ctx.flow ? `Flow ${ctx.flow}` : 'Flow 1';
    const action = ctx.action_id != null ? `Action ${ctx.action_id}` : '—';
    return { flow, action };
  }

  // (b) Description regex — fallback for legacy / daemon tasks.
  const desc = task.title || task.description || '';
  let m = desc.match(/Flow\s+(\d+)\s*\/\s*Action\s+(\d+)/i);
  if (m) return { flow: `Flow ${m[1]}`, action: `Action ${m[2]}` };
  m = desc.match(/Execute\s+Action\s+(\d+)\b/i);
  if (m) return { flow: 'Flow 1', action: `Action ${m[1]}` };
  m = desc.match(/\bAction\s+(\d+)\b/i);
  if (m) return { flow: 'Flow 1', action: `Action ${m[1]}` };
  return { flow: '—', action: '—' };
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


// #204 — flow sub-header.  Sits between GroupHeaderRow (prompt level)
// and TaskRow (action level).  Renders the flow label + per-flow
// status counts so the operator can see at-a-glance "Flow 2 has 4
// actions, 1 in_progress, 2 completed".
function FlowSubHeaderRow({ flow, expanded, onToggle, highlightId }) {
  const counts = statusBreakdown(flow.tasks);
  const inProgress = counts.IN_PROGRESS || 0;
  const blocked = counts.BLOCKED || 0;
  const completed = counts.COMPLETED || 0;
  const failed = counts.FAILED || 0;
  const pending = counts.PENDING || 0;
  const hasHighlight = highlightId && flow.tasks.some(
    t => (t.id || t.task_id) === highlightId);
  return (
    <TableRow hover onClick={onToggle}
      sx={{
        cursor: 'pointer',
        bgcolor: hasHighlight
          ? 'rgba(108,99,255,0.10)'
          : 'rgba(108,99,255,0.02)',
        '&:hover': { bgcolor: 'rgba(108,99,255,0.07)' },
        '& td': { borderBottom: '1px solid rgba(108,99,255,0.08)' },
      }}>
      <TableCell padding="checkbox" sx={{ pl: 3 }}>
        <IconButton size="small">
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
      </TableCell>
      <TableCell colSpan={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{
            fontWeight: 500, color: 'text.secondary', pl: 1,
          }}>
            ↳ {flow.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • {flow.tasks.length} action{flow.tasks.length === 1 ? '' : 's'}
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
      <TableCell></TableCell>
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
  // #204 — per-flow expanded state (middle level).  Default to expanded
  // when the parent group is expanded AND the flow has in_progress
  // tasks; otherwise collapsed so the operator can scan flow headers
  // first then drill into the hot one.
  const [expandedFlows, setExpandedFlows] = useState({});
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

  // #204 — Three-level grouping: prompt → flow → action.
  //
  // User complaint (2026-05-18): "grouping shows only one action at a
  // time like action 3, a group shd have action 1 to action n and
  // flow 1 to flow m".  Previously a single (agent_id, prompt_id)
  // bucket collapsed all flows + actions into one flat list per
  // session, which read as "one action per group" when each flow had
  // its own session row.
  //
  // Now: outer = (agent_id, prompt_id), middle = parsed flow id
  // (default 'Flow 1' when only Action N is encoded), inner = task
  // rows.  parseFlowAction reads the description string because the
  // backend Task model (agent_ledger/core.py:191) has no flow/action
  // fields yet — extending it is tracked separately.
  //
  // Each level tracks its own status counts + mostRecent so sort can
  // float hot flows to the top within a prompt.
  const groups = useMemo(() => {
    const statusRank = (s) => ({
      IN_PROGRESS: 0, BLOCKED: 1, PENDING: 2, FAILED: 3,
      DELEGATED: 4, COMPLETED: 5, DEFERRED: 6,
    }[(s || '').toUpperCase()] ?? 9);
    const actionRank = (label) => {
      const m = label && label.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 9999;
    };

    const byKey = {};
    for (const t of tasks) {
      const k = groupKey(t);
      if (!byKey[k]) {
        byKey[k] = {
          key: k,
          agent_id: t.agent_id || 'no-agent',
          prompt_id: t.owner_prompt_id || 'no-prompt',
          tasks: [],          // ALL tasks under this prompt (back-compat)
          flows: {},          // flow_label → {label, tasks, mostRecent}
          mostRecent: 0,
        };
      }
      byKey[k].tasks.push(t);

      const {flow: flowLabel, action: actionLabel} = parseFlowAction(t);
      if (!byKey[k].flows[flowLabel]) {
        byKey[k].flows[flowLabel] = {
          key: `${k}__${flowLabel}`,
          label: flowLabel,
          tasks: [],
          mostRecent: 0,
        };
      }
      // Stamp the parsed action label on the task so TaskRow can show
      // it without re-parsing.  Non-destructive — we read .description
      // again if this attribute is missing.
      t._parsedActionLabel = actionLabel;
      byKey[k].flows[flowLabel].tasks.push(t);

      const ts = Date.parse(
        t.last_heartbeat_at || t.created_at || ''
      );
      if (!isNaN(ts)) {
        if (ts > byKey[k].mostRecent) byKey[k].mostRecent = ts;
        if (ts > byKey[k].flows[flowLabel].mostRecent) {
          byKey[k].flows[flowLabel].mostRecent = ts;
        }
      }
    }

    // Within each flow, sort tasks by action number then status rank.
    Object.values(byKey).forEach((g) => {
      g.tasks.sort((a, b) => {
        const sa = statusRank(a.status);
        const sb = statusRank(b.status);
        if (sa !== sb) return sa - sb;
        return Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);
      });
      Object.values(g.flows).forEach((f) => {
        f.tasks.sort((a, b) => {
          const ra = actionRank(a._parsedActionLabel);
          const rb = actionRank(b._parsedActionLabel);
          if (ra !== rb) return ra - rb;
          const sa = statusRank(a.status);
          const sb = statusRank(b.status);
          if (sa !== sb) return sa - sb;
          return Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);
        });
      });
      // Convert flows dict → sorted array (hot flows first, then by
      // flow number ascending so Flow 1 comes before Flow 2).
      g.flowList = Object.values(g.flows).sort((a, b) => {
        const ai = a.tasks.some(t => (t.status || '').toUpperCase() === 'IN_PROGRESS') ? 0 : 1;
        const bi = b.tasks.some(t => (t.status || '').toUpperCase() === 'IN_PROGRESS') ? 0 : 1;
        if (ai !== bi) return ai - bi;
        const na = actionRank(a.label);
        const nb = actionRank(b.label);
        if (na !== nb) return na - nb;
        return b.mostRecent - a.mostRecent;
      });
    });

    // Sort prompt-level groups: those with in_progress first, then
    // by mostRecent desc.
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
  const toggleFlow = (key) => setExpandedFlows(
    (p) => ({...p, [key]: !p[key]}));

  // #204 — default-expand flows that have in_progress tasks the first
  // time they appear (mirrors the prompt-level auto-expand at the
  // useEffect above).  Idempotent on re-render: only sets the key if
  // it's currently undefined.
  useEffect(() => {
    setExpandedFlows((prev) => {
      const next = {...prev};
      for (const g of groups) {
        for (const f of (g.flowList || [])) {
          if (next[f.key] === undefined) {
            next[f.key] = f.tasks.some(t => {
              const s = (t.status || '').toUpperCase();
              return s === 'IN_PROGRESS' || s === 'BLOCKED';
            });
          }
        }
      }
      return next;
    });
  }, [groups]);

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
                const flowList = group.flowList || [];
                // If there's only one synthetic '—' flow (no recipe
                // structure parsed), skip the flow sub-header and
                // render tasks directly under the prompt header for
                // the same density as the old 2-level view.
                const flat = flowList.length <= 1
                  && flowList[0]?.label === '—';
                return (
                  <React.Fragment key={group.key}>
                    <GroupHeaderRow group={group} expanded={isExpanded}
                      onToggle={() => toggleGroup(group.key)}
                      highlightId={highlightId} />
                    {isExpanded && flat && group.tasks.map((task) => {
                      const tid = task.id || task.task_id || '';
                      const isHighlighted = highlightId && tid === highlightId;
                      return (
                        <TaskRow key={tid} task={task}
                          isHighlighted={isHighlighted}
                          highlightRef={highlightRef} />
                      );
                    })}
                    {isExpanded && !flat && flowList.map((flow) => {
                      const flowExpanded = expandedFlows[flow.key] ?? false;
                      return (
                        <React.Fragment key={flow.key}>
                          <FlowSubHeaderRow flow={flow} expanded={flowExpanded}
                            onToggle={() => toggleFlow(flow.key)}
                            highlightId={highlightId} />
                          {flowExpanded && flow.tasks.map((task) => {
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
