/**
 * AgentOperationsDrawer — Phase B drill-down for one agent.
 *
 * Mounted by AgentDashboardPage; opens when the user clicks an
 * AgentCard.  Reads two endpoints under /api/social/dashboard:
 *   - /agents/<id>/snapshot   — goal tree, status, last dispatch decision
 *   - /agents/<id>/chat?since — autogen GroupChat tail (live conv)
 *
 * Both endpoints already exist as of 2026-05-17 (Phase B backend in
 * dashboard_service.py + api_dashboard.py).  No new transport, no new
 * SSE topic — straight polling at 2s/1s cadences because the data is
 * already cached server-side and the queries are O(few rows).
 *
 * Reuses StatusChip + STATUS_CONFIG from AgentDashboardPage.js to keep
 * one canonical chip across the dashboard surface — no parallel chip
 * component, no risk of color drift.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Divider,
  CircularProgress,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ChatIcon from '@mui/icons-material/Chat';
import MemoryIcon from '@mui/icons-material/Memory';
import HubIcon from '@mui/icons-material/Hub';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SendIcon from '@mui/icons-material/Send';
import { Button, TextField } from '@mui/material';

import { SOCIAL_API_URL } from '../../config/apiBase';

const SNAPSHOT_POLL_MS = 2000;
const CHAT_POLL_MS = 1000;

// Tier label + color (mirrors HartosBaseUrlResolver.ServedBy on the
// Android side — keep these in sync if the enum ever changes).
const TIER_BADGES = {
  LOCAL_DEVICE: { color: '#6C63FF', label: 'LOCAL' },
  LOCAL_LAN:    { color: '#9B94FF', label: 'LAN P2P' },
  CLOUD:        { color: '#ff9800', label: 'CLOUD' },
};

// Match the parent dashboard's status colors so a status chip looks
// identical between the card and the drawer header.  Importing the
// object from the page would create a circular dep; copying 12 lines
// is the simpler, DRY-equivalent move.
const STATUS_COLORS = {
  active: '#6C63FF', executing: '#9B94FF', healthy: '#6C63FF',
  stalled: '#ff9800', frozen: '#ff4444', idle: '#888',
  paused: '#aaa', pending: '#999', failed: '#ff4444',
  completed: '#666', dead: '#ff0000', unknown: '#555',
};

function StatusChip({ status, reason }) {
  const color = STATUS_COLORS[status] || '#555';
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        label={status || 'unknown'}
        size="small"
        sx={{
          bgcolor: `${color}22`, color, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}
      />
      {reason && (
        <Typography variant="caption"
          sx={{ color, fontStyle: 'italic', opacity: 0.85 }}>
          {reason}
        </Typography>
      )}
    </Stack>
  );
}

function GoalTreePanel({ tree }) {
  if (!tree || tree.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 2 }}>
        No tasks captured for this agent yet.
      </Typography>
    );
  }
  // Group by parent_task_id to render a 2-level tree without a heavy
  // tree component.  Roots = parent_task_id null/absent; children =
  // everything else.  Tree depth > 2 falls back to a flat list under
  // its nearest parent.
  const byParent = {};
  tree.forEach(node => {
    const key = node.parent_task_id || '__root__';
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(node);
  });
  const roots = byParent.__root__ || tree;

  const renderNode = (node, depth) => (
    <Box key={node.task_id} sx={{ pl: depth * 2, mb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{
          width: 8, height: 8, borderRadius: '50%',
          bgcolor: STATUS_COLORS[node.status] || '#555',
          flexShrink: 0,
        }} />
        <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.85rem' }}>
          {node.title || node.task_id}
        </Typography>
        <Chip label={node.status} size="small"
          sx={{
            ml: 'auto !important', height: 18,
            bgcolor: `${STATUS_COLORS[node.status] || '#555'}22`,
            color: STATUS_COLORS[node.status] || '#888',
            fontSize: '0.65rem',
          }} />
      </Stack>
      {node.blocked_reason && (
        <Typography variant="caption" sx={{
          color: '#ff9800', display: 'block', pl: 2.5, fontStyle: 'italic',
        }}>
          {node.blocked_reason}
        </Typography>
      )}
      {(byParent[node.task_id] || []).map(child => renderNode(child, depth + 1))}
    </Box>
  );

  return <Box>{roots.map(node => renderNode(node, 0))}</Box>;
}

function ConversationPanel({ agentId, registered, messages, onNewIndex }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    // Stick to bottom when new messages arrive.
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!registered) {
    return (
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 2 }}>
        No live conversation captured for this agent yet.  Triggers a /chat
        round to populate this view.
      </Typography>
    );
  }
  return (
    <Box ref={scrollRef}
      sx={{
        maxHeight: 'calc(100vh - 280px)', overflowY: 'auto',
        bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, p: 1.5,
      }}>
      {messages.length === 0 && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
          GroupChat is registered but empty — waiting for first turn.
        </Typography>
      )}
      {messages.map((msg, i) => (
        <Box key={msg.index ?? i} sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption"
              sx={{ color: '#6C63FF', fontWeight: 700, letterSpacing: 0.5 }}>
              {msg.speaker}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
              {msg.role}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{
            color: '#fff', fontSize: '0.85rem', mt: 0.25,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {msg.content || <em>(empty)</em>}
          </Typography>
          {msg.tool_calls && msg.tool_calls.length > 0 && (
            <Typography variant="caption" sx={{
              color: '#9B94FF', display: 'block', mt: 0.25,
            }}>
              tool: {msg.tool_calls.map(t => t.name || JSON.stringify(t)).join(', ')}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

function A2APanel({ graph, onNavigate }) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 2 }}>
        No A2A delegations recorded for this agent.
      </Typography>
    );
  }
  const rootId = graph.root_id;
  const others = graph.nodes.filter(n => n.id !== rootId);

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Root agent
        </Typography>
        <Typography variant="body2" sx={{
          color: '#6C63FF', fontWeight: 700, fontFamily: 'monospace',
          fontSize: '0.8rem',
        }}>
          {rootId}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
      {others.map(node => {
        const role = node.role; // 'delegate' or 'delegator'
        const edge = (graph.edges || []).find(
          e => e.from === rootId && e.to === node.id
        ) || (graph.edges || []).find(e => e.to === rootId && e.from === node.id);
        return (
          <Box key={node.id}
            onClick={() => onNavigate && onNavigate(node.id)}
            sx={{
              cursor: onNavigate ? 'pointer' : 'default',
              p: 1.5, borderRadius: 1,
              bgcolor: 'rgba(108,99,255,0.05)',
              border: '1px solid rgba(108,99,255,0.15)',
              '&:hover': { bgcolor: 'rgba(108,99,255,0.1)' },
            }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{
                color: '#9B94FF', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {role === 'delegate' ? '→ delegated to' : '← delegated by'}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{
              color: '#fff', fontFamily: 'monospace', fontSize: '0.8rem',
              mt: 0.5,
            }}>
              {node.id}
            </Typography>
            {edge && edge.status && (
              <Chip label={edge.status} size="small" sx={{
                mt: 0.5, height: 18, fontSize: '0.65rem',
                bgcolor: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.6)',
              }} />
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

function SteeringControls({ agentId, currentStatus, onAction }) {
  // Disable verbs that don't make sense given current status.
  const canPause = currentStatus === 'active' || currentStatus === 'stalled';
  const canResume = currentStatus === 'paused';
  const canCancel = currentStatus !== 'archived' && currentStatus !== 'completed';

  const fire = async (verb) => {
    try {
      const res = await fetch(
        `${SOCIAL_API_URL}/dashboard/agents/${agentId}/${verb}`,
        { method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: `operator-${verb} via drawer` }) });
      if (res.ok) onAction && onAction(verb);
    } catch (_) { /* drawer poll will surface the new state */ }
  };

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
      <Button size="small" variant="outlined" startIcon={<PauseIcon />}
        disabled={!canPause}
        onClick={() => fire('pause')}
        sx={{ color: '#ff9800', borderColor: '#ff9800' }}>
        Pause
      </Button>
      <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />}
        disabled={!canResume}
        onClick={() => fire('resume')}
        sx={{ color: '#6C63FF', borderColor: '#6C63FF' }}>
        Resume
      </Button>
      <Button size="small" variant="outlined" startIcon={<StopIcon />}
        disabled={!canCancel}
        onClick={() => fire('cancel')}
        sx={{ color: '#ff4444', borderColor: '#ff4444' }}>
        Cancel
      </Button>
    </Stack>
  );
}

function InjectInstruction({ agentId, onSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(
        `${SOCIAL_API_URL}/dashboard/agents/${agentId}/inject`,
        { method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction: text }) });
      if (res.ok) {
        setText('');
        onSent && onSent();
      }
    } finally {
      setSending(false);
    }
  };
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
        Inject instruction into GroupChat
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
        <TextField size="small" fullWidth value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. retry the failing step with the cloud model"
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#fff',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(108,99,255,0.3)' },
            },
          }} />
        <Button size="small" variant="contained"
          disabled={sending || !text.trim()}
          onClick={send}
          startIcon={<SendIcon />}
          sx={{ bgcolor: '#6C63FF' }}>
          Send
        </Button>
      </Stack>
    </Box>
  );
}

function ModelStatePanel({ lastDispatch, eta }) {
  // Phase D extension: eta = {avg_seconds, p95_seconds, elapsed_seconds}
  // null when no historical samples or feature not enabled yet.
  const overAvg = eta && eta.elapsed_seconds && eta.avg_seconds
    && eta.elapsed_seconds > eta.avg_seconds * 1.5;
  if (!lastDispatch) {
    return (
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 2 }}>
        No dispatcher decision logged for this agent yet.
      </Typography>
    );
  }
  const tier = lastDispatch.tier || 'CLOUD';
  const badge = TIER_BADGES[tier] || TIER_BADGES.CLOUD;
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Model
        </Typography>
        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
          {lastDispatch.model || 'unknown'}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Tier
        </Typography>
        <Chip label={badge.label} size="small" sx={{
          mt: 0.5, bgcolor: `${badge.color}22`, color: badge.color,
          fontWeight: 700,
        }} />
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Last dispatched
        </Typography>
        <Typography variant="body2" sx={{ color: '#fff' }}>
          {lastDispatch.timestamp
            ? new Date(lastDispatch.timestamp).toLocaleString()
            : '—'}
        </Typography>
      </Box>
      {lastDispatch.request_id && (
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Request ID
          </Typography>
          <Typography variant="body2" sx={{
            color: '#9B94FF', fontFamily: 'monospace', fontSize: '0.75rem',
          }}>
            {lastDispatch.request_id}
          </Typography>
        </Box>
      )}
      {eta && (eta.avg_seconds || eta.p95_seconds) && (
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            ETA (history)
          </Typography>
          <Typography variant="body2" sx={{
            color: overAvg ? '#ff9800' : '#fff',
          }}>
            avg {eta.avg_seconds || '—'}s
            {' / '}
            p95 {eta.p95_seconds || '—'}s
            {eta.elapsed_seconds !== undefined && (
              <> — elapsed {eta.elapsed_seconds}s{overAvg && ' ⚠ over avg'}</>
            )}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

export default function AgentOperationsDrawer({ agentId, open, onClose }) {
  const [tab, setTab] = useState(0);
  const [snapshot, setSnapshot] = useState(null);
  const [chatState, setChatState] = useState({
    messages: [], nextIndex: 0, registered: false,
  });
  // Phase C: A2A graph (lazy-loaded when user opens the A2A tab).
  const [a2a, setA2a] = useState(null);
  // Internal navigation: clicking an A2A node swaps agentId.
  const [internalAgentId, setInternalAgentId] = useState(null);
  const activeId = internalAgentId || agentId;
  const [error, setError] = useState(null);
  const cursorRef = useRef(0);

  // Reset state when agentId changes from the parent (close + reopen).
  useEffect(() => {
    setSnapshot(null);
    setChatState({ messages: [], nextIndex: 0, registered: false });
    setA2a(null);
    setInternalAgentId(null);
    setError(null);
    cursorRef.current = 0;
    setTab(0);
  }, [agentId]);

  // Also reset chat + a2a when internal nav swaps activeId.
  useEffect(() => {
    if (internalAgentId) {
      setSnapshot(null);
      setChatState({ messages: [], nextIndex: 0, registered: false });
      setA2a(null);
      cursorRef.current = 0;
    }
  }, [internalAgentId]);

  const fetchSnapshot = useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await fetch(
        `${SOCIAL_API_URL}/dashboard/agents/${activeId}/snapshot`,
        { credentials: 'include' });
      if (!res.ok) {
        setError(`snapshot ${res.status}`);
        return;
      }
      const body = await res.json();
      if (body.success) {
        setSnapshot(body.data);
        setError(null);
      } else {
        setError(body.error || 'unknown');
      }
    } catch (e) {
      setError(`fetch failed: ${e.message}`);
    }
  }, [activeId]);

  const fetchA2A = useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await fetch(
        `${SOCIAL_API_URL}/dashboard/agents/${activeId}/a2a?depth=2`,
        { credentials: 'include' });
      if (!res.ok) return;
      const body = await res.json();
      if (body.success) setA2a(body.data);
    } catch (_) { /* lazy poll on next tab visit */ }
  }, [activeId]);

  const fetchChatTail = useCallback(async () => {
    if (!activeId) return;
    try {
      const res = await fetch(
        `${SOCIAL_API_URL}/dashboard/agents/${activeId}/chat`
          + `?since=${cursorRef.current}&limit=50`,
        { credentials: 'include' });
      if (!res.ok) return;
      const body = await res.json();
      if (!body.success) return;
      const { messages, next_index, registered } = body.data;
      if (messages && messages.length > 0) {
        setChatState(prev => ({
          // Append new ones; dedup on `index` in case of overlap.
          messages: (prev.messages.length === 0 || cursorRef.current === 0)
            ? messages
            : [...prev.messages, ...messages.filter(
                m => m.index >= prev.nextIndex)],
          nextIndex: next_index,
          registered: true,
        }));
        cursorRef.current = next_index;
      } else if (registered !== chatState.registered) {
        setChatState(prev => ({ ...prev, registered }));
      }
    } catch (e) {
      // Silent — the next tick will retry.
    }
  }, [activeId, chatState.registered]);

  useEffect(() => {
    if (!open || !activeId) return;
    fetchSnapshot();
    const id = setInterval(fetchSnapshot, SNAPSHOT_POLL_MS);
    return () => clearInterval(id);
  }, [open, activeId, fetchSnapshot]);

  useEffect(() => {
    if (!open || !activeId || tab !== 1) return;
    fetchChatTail();
    const id = setInterval(fetchChatTail, CHAT_POLL_MS);
    return () => clearInterval(id);
  }, [open, activeId, tab, fetchChatTail]);

  // Lazy-load A2A graph when its tab opens (no poll — graph changes
  // rarely, refetch only on tab focus).
  useEffect(() => {
    if (open && activeId && tab === 3 && !a2a) {
      fetchA2A();
    }
  }, [open, activeId, tab, a2a, fetchA2A]);

  return (
    <Drawer
      anchor="right" open={open} onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '95vw', md: '60vw' },
          bgcolor: 'rgba(15, 15, 26, 0.98)',
          backdropFilter: 'blur(20px)',
          color: '#fff',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
        },
      }}>
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {snapshot?.agent?.name || 'Loading…'}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {snapshot?.agent && (
          <Box sx={{ mt: 1 }}>
            <StatusChip status={snapshot.agent.status}
              reason={snapshot.agent.status_reason} />
            <SteeringControls
              agentId={activeId}
              currentStatus={snapshot.agent.status}
              onAction={() => fetchSnapshot()}
            />
          </Box>
        )}
        {internalAgentId && (
          <Box sx={{ mt: 1 }}>
            <Button size="small" onClick={() => setInternalAgentId(null)}
              sx={{ color: '#6C63FF', textTransform: 'none', p: 0 }}>
              ← back to root agent
            </Button>
          </Box>
        )}
        {error && (
          <Typography variant="caption" sx={{
            color: '#ff4444', display: 'block', mt: 1,
          }}>
            {error}
          </Typography>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          '& .MuiTab-root': { color: 'rgba(255,255,255,0.5)' },
          '& .Mui-selected': { color: '#6C63FF !important' },
          '& .MuiTabs-indicator': { backgroundColor: '#6C63FF' },
        }}>
        <Tab icon={<AccountTreeIcon />} iconPosition="start" label="Goal Tree" />
        <Tab icon={<ChatIcon />} iconPosition="start" label="Conversation" />
        <Tab icon={<MemoryIcon />} iconPosition="start" label="Model" />
        <Tab icon={<HubIcon />} iconPosition="start" label="A2A" />
      </Tabs>

      {/* Tab content */}
      <Box sx={{ p: 2.5, flexGrow: 1, overflow: 'hidden' }}>
        {!snapshot && (
          <Stack alignItems="center" sx={{ mt: 4 }}>
            <CircularProgress size={28} sx={{ color: '#6C63FF' }} />
          </Stack>
        )}
        {snapshot && tab === 0 && <GoalTreePanel tree={snapshot.tree} />}
        {snapshot && tab === 1 && (
          <>
            <ConversationPanel
              agentId={activeId}
              registered={chatState.registered}
              messages={chatState.messages}
              onNewIndex={i => { cursorRef.current = i; }}
            />
            <InjectInstruction agentId={activeId}
              onSent={() => { cursorRef.current = chatState.nextIndex; fetchChatTail(); }} />
          </>
        )}
        {snapshot && tab === 2 && (
          <ModelStatePanel lastDispatch={snapshot.last_dispatch}
            eta={snapshot.eta} />
        )}
        {snapshot && tab === 3 && (
          <A2APanel graph={a2a} onNavigate={setInternalAgentId} />
        )}
      </Box>
    </Drawer>
  );
}
