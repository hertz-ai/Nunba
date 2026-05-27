/**
 * NotificationBell — global bell + badge + dropdown for the AppBar.
 *
 * Closes the UI half of #198.  Reads /api/social/notifications via
 * the existing notificationsApi helper (socialApi.js:94).  Pure
 * presentational consumer of the backend that already exists —
 * no new API.
 *
 * Behaviour:
 *   - Polls /notifications?unread=true every 30s (matches the
 *     MarketingFunnelCard cadence).  Could move to SSE later via the
 *     existing 'notification' event in realtimeService.js:213 — the
 *     polling fallback keeps it working when SSE is offline.
 *   - Badge shows unread count; click opens a dropdown menu.
 *   - Each notification row click → navigate to source +
 *     POST /notifications/read with [id].
 *   - "Mark all read" button hits /notifications/read-all.
 *
 * Wire: drop <NotificationBell /> into any AppBar Toolbar.  No
 * props needed.  Plays MUI theme — uses the same iconContainerStyle
 * tokens as MarketingFunnelCard.
 */
import {notificationsApi} from '../../services/socialApi';
import realtimeService from '../../services/realtimeService';
import useAuthSession from '../../hooks/useAuthSession';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon
  from '@mui/icons-material/NotificationsNone';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';


// Map notification.type → in-app navigation path.  Add a new branch
// here when a new server-side notification type ships; no other
// file needs editing.
//
// Generic deeplink contract (added 2026-05-26, P0-C of
// memory/consent_fanout_p0_p3_plan.md): any notification whose
// JSON message payload contains a `deeplink` (or `target_url`)
// field is routed there first, before falling through to the
// type-prefix table.  Lets new notification kinds (channel pair
// codes, oauth handshakes, etc.) ship without per-type bell code.
function resolveTargetPath(notification) {
  if (!notification) return null;
  try {
    const m = typeof notification.message === 'string'
      ? JSON.parse(notification.message)
      : notification.message;
    if (m && (m.deeplink || m.target_url)) {
      return m.deeplink || m.target_url;
    }
  } catch (_) { /* message wasn't JSON — fall through */ }
  if (notification.deeplink) return notification.deeplink;
  const t = notification.type || '';
  const ref = notification.reference_id || notification.target_id;
  if (t.startsWith('post.') && ref) return `/post/${ref}`;
  if (t.startsWith('agent.') && ref) return `/admin/agents?agent=${ref}`;
  if (t.startsWith('comment.') && ref) return `/post/${ref}`;
  if (t.startsWith('follow.') && ref) return `/users/${ref}`;
  if (t.startsWith('consent.') && ref) return `/admin/consent/${ref}`;
  return null;
}


// #201 — cross-user agent provenance label.
// When a notification was emitted on behalf of ANOTHER user's agent
// (e.g. someone else's recipe ran a tool that mentions us), surface
// "anonymous user via agent Y" so the recipient knows the event
// didn't come from a person typing — it came from someone's
// autonomous agent.  We deliberately don't show the OTHER user's
// identity (privacy by default in HARTOS); "anonymous user" is the
// label.  When the agent name is unknown we fall back to "their
// agent".  When the notification doesn't carry sender_user_id at
// all (system message, own action) we return null.
function formatProvenance(notification, currentUserId) {
  if (!notification) return null;
  const senderUid = (
    notification.sender_user_id
    || notification.actor_user_id
    || notification.source_user_id
    || null
  );
  if (!senderUid || senderUid === currentUserId) return null;
  const agentName = (
    notification.agent_name
    || notification.actor_agent_name
    || notification.via_agent_name
    || null
  );
  return agentName
    ? `anonymous user · via ${agentName}`
    : `anonymous user · via their agent`;
}


function formatRelativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const delta = Date.now() - then;
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h`;
  return `${Math.floor(delta / 86_400_000)}d`;
}


export default function NotificationBell() {
  const [anchor, setAnchor] = useState(null);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const open = Boolean(anchor);
  // #201 — used by formatProvenance to suppress the cross-user
  // label when the notification's sender is the current user.
  const session = useAuthSession();
  const currentUserId = session?.identity?.user_id || null;

  const load = useCallback(async () => {
    try {
      const resp = await notificationsApi.list({
        unread: true, limit: 10,
      });
      // socialApi.get response shape: {data: {data: [...], meta?}}
      // Match the social_bp _ok() contract used by /notifications.
      const payload = resp?.data?.data || resp?.data || [];
      const list = Array.isArray(payload) ? payload : [];
      setItems(list);
      setUnreadCount(list.length);
    } catch (err) {
      // 401 / network — leave existing state, retry on next tick
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    // P1-S1 cross-device read sync (2026-05-26): when ANOTHER device
    // marks a notification read, the server publishes a
    // 'notification.read' SSE/WAMP event with the affected ids.
    // We drop those ids from local state so the badge stays in sync
    // without waiting for the 30s poll cycle.  Same pipe the
    // 'notification' subscriber (SocialContext.js:210) already uses.
    const unsubRead = realtimeService.on('notification.read', (payload) => {
      const ids = (payload && Array.isArray(payload.ids)) ? payload.ids : [];
      if (ids.length === 0) return;
      const idSet = new Set(ids.map(String));
      setItems(prev => prev.filter(n => !idSet.has(String(n.id))));
      setUnreadCount(prev => Math.max(0, prev - ids.length));
    });
    return () => {
      clearInterval(interval);
      if (typeof unsubRead === 'function') unsubRead();
    };
  }, [load]);

  const handleOpen = (e) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  const handleItemClick = async (notification) => {
    handleClose();
    // P1-S2 optimistic decrement (2026-05-26): adjust badge + list
    // BEFORE the markRead round-trip so the UI feels instant.  On
    // failure we reload to recover authoritative state.
    setItems(prev => prev.filter(n => String(n.id) !== String(notification.id)));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await notificationsApi.markRead([notification.id]);
    } catch (_e) {
      // Roll back to the server's view; the badge will re-show if the
      // mark-read failed.
      load();
    }
    const path = resolveTargetPath(notification);
    if (path) navigate(path);
  };

  const handleMarkAll = async () => {
    // P1-S2 optimistic clear (2026-05-26): empty the list + zero the
    // badge first; rollback via load() if the bulk update fails.
    setItems([]);
    setUnreadCount(0);
    try {
      await notificationsApi.markAllRead();
    } catch (_e) {
      load();
    }
  };

  return (
    <>
      <Tooltip title="Notifications" arrow>
        <IconButton
          onClick={handleOpen}
          aria-label="notifications"
          sx={{
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              color: '#6C63FF',
              background: 'rgba(108, 99, 255, 0.1)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <Badge
            badgeContent={unreadCount}
            max={99}
            color="error"
            invisible={unreadCount === 0}
          >
            {unreadCount > 0
              ? <NotificationsIcon />
              : <NotificationsNoneIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 320,
            maxWidth: 400,
            background: 'rgba(15, 15, 26, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.05)',
            color: '#fff',
          },
        }}
      >
        <Box sx={{
          px: 2, py: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Typography variant="subtitle2" sx={{fontWeight: 600}}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCircleIcon fontSize="small" />}
              onClick={handleMarkAll}
              sx={{color: '#6C63FF', textTransform: 'none'}}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider sx={{borderColor: 'rgba(255,255,255,0.05)'}} />
        {items.length === 0 ? (
          <Box sx={{p: 3, textAlign: 'center'}}>
            <Typography variant="caption" sx={{
              color: 'rgba(255,255,255,0.4)',
              fontStyle: 'italic',
            }}>
              No new notifications
            </Typography>
          </Box>
        ) : (
          items.map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => handleItemClick(n)}
              sx={{
                py: 1.5,
                px: 2,
                alignItems: 'flex-start',
                whiteSpace: 'normal',
                '&:hover': {
                  background: 'rgba(108, 99, 255, 0.1)',
                },
              }}
            >
              <Box sx={{flex: 1}}>
                <Typography variant="body2" sx={{
                  color: '#fff',
                  fontWeight: 500,
                  mb: 0.25,
                }}>
                  {n.title || n.type || 'Notification'}
                </Typography>
                {(() => {
                  // #201 — cross-user agent provenance label
                  const prov = formatProvenance(n, currentUserId);
                  return prov ? (
                    <Typography variant="caption" sx={{
                      color: 'rgba(108, 99, 255, 0.85)',
                      display: 'block',
                      fontStyle: 'italic',
                      mb: 0.25,
                    }}>
                      {prov}
                    </Typography>
                  ) : null;
                })()}
                {n.body && (
                  <Typography variant="caption" sx={{
                    color: 'rgba(255,255,255,0.6)',
                    display: 'block',
                  }}>
                    {n.body.length > 120
                      ? `${n.body.slice(0, 120)}…` : n.body}
                  </Typography>
                )}
                <Typography variant="caption" sx={{
                  color: 'rgba(255,255,255,0.4)',
                  mt: 0.5,
                  display: 'block',
                }}>
                  {formatRelativeTime(n.created_at || n.ts)}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
