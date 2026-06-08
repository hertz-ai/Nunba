import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewListIcon from '@mui/icons-material/ViewList';
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

// Group key derivation — one row in the grouped view = one prompt-level
// bucket (the agent identity).  Phase 5 (2026-05-27): grouping is now
// four-level: prompt → session → flow → action.  This function returns
// only the OUTERMOST key (the prompt); the session_id is a separate
// inner layer (see sessionKey() below).
//
// Source preference for the prompt-id stamp:
//   1. task.recipe_prompt_id  — explicit field stamped by
//      create_ledger_from_actions on every Task (Phase 1, 2026-05-27).
//      Honours the canonical type contract from CLAUDE.md
//      "Canonical Identifier Types": prompt_id is int for humans,
//      UUID for autonomous agents; both arrive here as string.
//   2. task.owner_prompt_id   — pre-Phase-1 fallback for legacy ledgers.
//   3. task.agent_id          — last-resort fallback (the convention is
//      agent_id == prompt_id for human-created agents).
//   4. 'no-prompt'            — daemon-injected tasks created outside a
//      prompt context still get a bucket so they're not lost.
function groupKey(task) {
  return (
    task.recipe_prompt_id ||
    task.owner_prompt_id ||
    task.agent_id ||
    'no-prompt'
  );
}

// Session key — Phase 5 second-level grouping.  ``session_id`` is
// injected by the flat /api/agent-engine/ledger/tasks handler (see
// integrations/agent_engine/api.py:351); legacy records that pre-date
// the injection fall back to a synthetic 'session=—' bucket so the
// renderer still has somewhere to put them.
function sessionKey(task) {
  return task.session_id || 'session=—';
}

// #204 / #220 / Phase 5 (2026-05-27) — resolve flow + action identifiers.
//
// Source preference, in order:
//
//   (a) Explicit recipe_* fields stamped on Task by Phase 1 (agent-
//       ledger-opensource/agent_ledger/core.py Task.__init__).  These
//       are the canonical coordinates; the dashboard reads exactly the
//       integers the backend stamped — no regex, no context-dict probe.
//       See docs/architecture/TASK_LEDGER_GROUPING_FIX_PLAN.md §0 for
//       the type contract (flow_id + action_id are integers).
//
//   (b) Legacy context = {action_id, flow, persona} stamped by
//       create_ledger_from_actions on every Task pre-Phase-1 (the
//       previous canonical source).  Preserved so ledgers written
//       before 2026-05-27 still render correctly without backfill.
//
//   (c) Description regex — last-resort fallback for daemon-injected
//       tasks (e.g. zombie_reaper) that don't carry recipe metadata.
//
// When no signal is recoverable, the task lands in a synthetic
// "flow=- / action=-" bucket so it still groups under its prompt.
export function parseFlowAction(task) {
  // (a) Phase 1 explicit fields — strict precedence over legacy paths.
  if (task.recipe_flow_id != null || task.recipe_action_id != null) {
    const flow = task.recipe_flow_id != null
      ? `Flow ${task.recipe_flow_id}` : 'Flow 1';
    const action = task.recipe_action_id != null
      ? `Action ${task.recipe_action_id}` : '—';
    return { flow, action };
  }

  // (b) Pre-Phase-1 backend-stamped context.
  const ctx = task.context || task.context_json || {};
  if (ctx.action_id != null || ctx.flow != null) {
    const flow = ctx.flow ? `Flow ${ctx.flow}` : 'Flow 1';
    const action = ctx.action_id != null ? `Action ${ctx.action_id}` : '—';
    return { flow, action };
  }

  // (c) Description regex — fallback for legacy / daemon tasks.
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


// Phase 5 — session sub-header.  Sits between GroupHeaderRow (prompt
// level) and FlowSubHeaderRow.  Renders the session_id label + per-
// session status counts so the operator can see "session
// 10202_42_1716000999999 has 4 actions, 1 in_progress, 2 completed".
// Same visual language as FlowSubHeaderRow but one indent level
// shallower (sessions are above flows in the tree).
function SessionSubHeaderRow({ session, expanded, onToggle, highlightId }) {
  const counts = statusBreakdown(session.tasks);
  const inProgress = counts.IN_PROGRESS || 0;
  const blocked = counts.BLOCKED || 0;
  const completed = counts.COMPLETED || 0;
  const failed = counts.FAILED || 0;
  const pending = counts.PENDING || 0;
  const hasHighlight = highlightId && session.tasks.some(
    t => (t.id || t.task_id) === highlightId);
  return (
    <TableRow hover onClick={onToggle}
      sx={{
        cursor: 'pointer',
        bgcolor: hasHighlight
          ? 'rgba(108,99,255,0.12)'
          : 'rgba(108,99,255,0.03)',
        '&:hover': { bgcolor: 'rgba(108,99,255,0.08)' },
        '& td': { borderBottom: '1px solid rgba(108,99,255,0.10)' },
      }}>
      <TableCell padding="checkbox" sx={{ pl: 2 }}>
        <IconButton size="small">
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
      </TableCell>
      <TableCell colSpan={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{
            fontFamily: 'monospace', fontWeight: 500,
            color: '#6C63FF', opacity: 0.85,
          }}>
            session={shortId(session.label)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • {(session.flowList || []).length} flow{(session.flowList || []).length === 1 ? '' : 's'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • {session.tasks.length} action{session.tasks.length === 1 ? '' : 's'}
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
  // Phase 5 — per-session expand state, sits between prompt and flow.
  const [expandedSessions, setExpandedSessions] = useState({});
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
      const sk = sessionKey(t);
      if (!byKey[k]) {
        byKey[k] = {
          key: k,
          agent_id: t.agent_id || 'no-agent',
          prompt_id: groupKey(t),
          tasks: [],          // ALL tasks under this prompt (back-compat)
          // Phase 5: sessions layer between prompt and flow.
          // session_id → {key, label, tasks, flows, mostRecent}
          sessions: {},
          // flows kept at prompt-level for back-compat with renderers
          // that haven't been updated to four levels yet — points at
          // the same Flow objects under sessions['session=—'] when no
          // explicit session_id was injected.
          flows: {},
          mostRecent: 0,
        };
      }
      byKey[k].tasks.push(t);

      // Session bucket (Phase 5)
      if (!byKey[k].sessions[sk]) {
        byKey[k].sessions[sk] = {
          key: `${k}__${sk}`,
          label: sk,
          tasks: [],
          flows: {},          // flow_label → {label, tasks, mostRecent}
          mostRecent: 0,
        };
      }
      const session = byKey[k].sessions[sk];
      session.tasks.push(t);

      const {flow: flowLabel, action: actionLabel} = parseFlowAction(t);
      if (!session.flows[flowLabel]) {
        session.flows[flowLabel] = {
          key: `${session.key}__${flowLabel}`,
          label: flowLabel,
          tasks: [],
          mostRecent: 0,
        };
      }
      // Back-compat alias on the prompt-level flows dict so any
      // renderer that still reads .flows directly gets all tasks
      // across sessions for that flow label.  Same Flow object
      // instance when there is only one session — when multiple
      // sessions write the same flow label, the prompt-level
      // .flows[label] aggregates them (used only by the legacy
      // three-level expand path that we keep working below).
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
      session.flows[flowLabel].tasks.push(t);
      byKey[k].flows[flowLabel].tasks.push(t);

      const ts = Date.parse(
        t.last_heartbeat_at || t.created_at || ''
      );
      if (!isNaN(ts)) {
        if (ts > byKey[k].mostRecent) byKey[k].mostRecent = ts;
        if (ts > session.mostRecent) session.mostRecent = ts;
        if (ts > session.flows[flowLabel].mostRecent) {
          session.flows[flowLabel].mostRecent = ts;
        }
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

      // Per-session sort (Phase 5)
      Object.values(g.sessions).forEach((sess) => {
        sess.tasks.sort((a, b) => {
          const sa = statusRank(a.status);
          const sb = statusRank(b.status);
          if (sa !== sb) return sa - sb;
          return Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0);
        });
        Object.values(sess.flows).forEach((f) => {
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
        sess.flowList = Object.values(sess.flows).sort((a, b) => {
          const ai = a.tasks.some(t => (t.status || '').toUpperCase() === 'IN_PROGRESS') ? 0 : 1;
          const bi = b.tasks.some(t => (t.status || '').toUpperCase() === 'IN_PROGRESS') ? 0 : 1;
          if (ai !== bi) return ai - bi;
          const na = actionRank(a.label);
          const nb = actionRank(b.label);
          if (na !== nb) return na - nb;
          return b.mostRecent - a.mostRecent;
        });
      });

      // Sessions list: newest-first by mostRecent, with in-progress
      // sessions floated to the top (mirrors prompt-level sort).
      // Timestamped session_ids (Phase 2) collate later
      // lexicographically than legacy deterministic forms for the
      // same user_prefix, so session_id desc is a stable secondary key.
      g.sessionList = Object.values(g.sessions).sort((a, b) => {
        const ai = a.tasks.some(t => (t.status || '').toUpperCase() === 'IN_PROGRESS') ? 0 : 1;
        const bi = b.tasks.some(t => (t.status || '').toUpperCase() === 'IN_PROGRESS') ? 0 : 1;
        if (ai !== bi) return ai - bi;
        if (a.mostRecent !== b.mostRecent) return b.mostRecent - a.mostRecent;
        return (b.label || '').localeCompare(a.label || '');
      });

      // Prompt-level flows (back-compat for the legacy three-level
      // expand path).  Same sort as before.
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
  // Phase 5 — session toggle.  Same idempotent pattern as toggleFlow.
  const toggleSession = (key) => setExpandedSessions(
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

  // Phase 5 — default-expand sessions that contain IN_PROGRESS/BLOCKED
  // tasks the first time they appear.  Same idempotent pattern as the
  // flow expand effect above: only sets the key when undefined so the
  // user's explicit toggle survives re-renders.
  useEffect(() => {
    setExpandedSessions((prev) => {
      const next = {...prev};
      for (const g of groups) {
        for (const s of (g.sessionList || [])) {
          if (next[s.key] === undefined) {
            next[s.key] = s.tasks.some(t => {
              const st = (t.status || '').toUpperCase();
              return st === 'IN_PROGRESS' || st === 'BLOCKED';
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
                const sessionList = group.sessionList || [];
                const flowList = group.flowList || [];

                // ── Flat-mode optimization ───────────────────────
                // When there's exactly ONE session AND its only flow
                // is the synthetic '—' (no recipe structure parsed),
                // skip both sub-headers and render tasks directly
                // under the prompt header.  Preserves the
                // 2-level density the operator expects for
                // daemon-injected / unstructured tasks.
                const onlySession = sessionList.length === 1
                  ? sessionList[0] : null;
                const onlyFlow = onlySession && (onlySession.flowList || []).length === 1
                  ? onlySession.flowList[0] : null;
                const flat = !!(onlyFlow && onlyFlow.label === '—');

                // ── Should we render the session layer? ─────────
                // Only when there are 2+ sessions OR when a single
                // session has real flow structure (label != '—').
                // For a single-session-single-flat-flow group the
                // session row would be visual noise — collapse it
                // back to the legacy 3-level shape (prompt → flow →
                // action) so existing operators see no churn.
                const showSessionLayer = sessionList.length >= 2 ||
                  (sessionList.length === 1 && !flat);

                return (
                  <React.Fragment key={group.key}>
                    <GroupHeaderRow group={group} expanded={isExpanded}
                      onToggle={() => toggleGroup(group.key)}
                      highlightId={highlightId} />

                    {/* Flat: tasks rendered directly under prompt */}
                    {isExpanded && flat && group.tasks.map((task) => {
                      const tid = task.id || task.task_id || '';
                      const isHighlighted = highlightId && tid === highlightId;
                      return (
                        <TaskRow key={tid} task={task}
                          isHighlighted={isHighlighted}
                          highlightRef={highlightRef} />
                      );
                    })}

                    {/* 4-level: prompt → session → flow → action */}
                    {isExpanded && !flat && showSessionLayer && sessionList.map((session) => {
                      const sessionExpanded = expandedSessions[session.key] ?? false;
                      const sessionFlowList = session.flowList || [];
                      return (
                        <React.Fragment key={session.key}>
                          <SessionSubHeaderRow session={session}
                            expanded={sessionExpanded}
                            onToggle={() => toggleSession(session.key)}
                            highlightId={highlightId} />
                          {sessionExpanded && sessionFlowList.map((flow) => {
                            const flowExpanded = expandedFlows[flow.key] ?? false;
                            return (
                              <React.Fragment key={flow.key}>
                                <FlowSubHeaderRow flow={flow}
                                  expanded={flowExpanded}
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

                    {/* 3-level back-compat: prompt → flow → action
                        (when session layer would just add noise — e.g.
                        single legacy session with no '—' flow but the
                        layer adds no information).  This branch fires
                        when !flat && !showSessionLayer, which by
                        construction means sessionList.length===0 (no
                        session_id was ever injected — pre-Phase 4
                        flat-API response).  Render falls back to the
                        pre-Phase 5 path on group.flowList. */}
                    {isExpanded && !flat && !showSessionLayer && flowList.map((flow) => {
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
