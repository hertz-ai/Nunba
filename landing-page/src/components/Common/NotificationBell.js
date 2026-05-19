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
function resolveTargetPath(notification) {
  if (!notification) return null;
  const t = notification.type || '';
  const ref = notification.reference_id || notification.target_id;
  if (t.startsWith('post.') && ref) return `/post/${ref}`;
  if (t.startsWith('agent.') && ref) return `/admin/agents?agent=${ref}`;
  if (t.startsWith('comment.') && ref) return `/post/${ref}`;
  if (t.startsWith('follow.') && ref) return `/users/${ref}`;
  if (t.startsWith('consent.') && ref) return `/admin/consent/${ref}`;
  return null;
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
    return () => clearInterval(interval);
  }, [load]);

  const handleOpen = (e) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  const handleItemClick = async (notification) => {
    handleClose();
    try {
      await notificationsApi.markRead([notification.id]);
    } catch (_e) { /* network blip; navigate anyway */ }
    const path = resolveTargetPath(notification);
    if (path) navigate(path);
    load();
  };

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
    } catch (_e) { /* swallow */ }
    setItems([]);
    setUnreadCount(0);
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
