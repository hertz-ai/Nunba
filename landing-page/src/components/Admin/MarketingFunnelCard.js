/**
 * MarketingFunnelCard — dashboard tile reading /api/social/marketing/stats.
 *
 * Closes #184.  Single source of truth for which marketing channel
 * (Twitter/LinkedIn/Reddit/WhatsApp/HN) is converting downloads.
 * Reuses the existing dashboard cardStyle so the tile lands as a
 * Grid item next to TotalUsers/Posts/Agents/Latency without any
 * design drift.
 *
 * Wire: import this into DashboardPage and drop it as one Grid item.
 * It fetches its own data, refreshes every 30s, and renders the
 * leading channel + a compact table of clicks/downloads/installs/signups
 * by code.
 *
 * Backend contract (commit cbd0620 — /api/social/marketing/stats):
 *   { by_code: { code: {click, download, install, signup} }, total }
 */
import {adminApi} from '../../services/socialApi';

import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Tooltip,
  Stack,
} from '@mui/material';
import React, {useEffect, useState} from 'react';


const cardStyle = {
  height: '100%',
  background:
    'linear-gradient(135deg, rgba(26, 26, 46, 0.9) 0%, rgba(15, 15, 26, 0.95) 100%)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 3,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 20px 40px rgba(108, 99, 255, 0.1)',
    border: '1px solid rgba(108, 99, 255, 0.2)',
  },
};

const iconContainerStyle = {
  width: 48,
  height: 48,
  borderRadius: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'linear-gradient(135deg, rgba(108, 99, 255, 0.15) 0%, rgba(155, 148, 255, 0.15) 100%)',
  boxShadow: '0 8px 24px rgba(108, 99, 255, 0.1)',
};


function pickLeader(byCode) {
  // Return [code, totalDownloads] for the channel with the most downloads;
  // ties broken by total clicks, then alphabetical.  Empty input → null.
  if (!byCode || typeof byCode !== 'object') return null;
  let best = null;
  for (const [code, row] of Object.entries(byCode)) {
    const downloads = row?.download || 0;
    const clicks = row?.click || 0;
    if (!best
        || downloads > best.downloads
        || (downloads === best.downloads && clicks > best.clicks)
        || (downloads === best.downloads && clicks === best.clicks
            && code < best.code)) {
      best = {code, downloads, clicks};
    }
  }
  return best;
}


export default function MarketingFunnelCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await adminApi.marketingStats();
        if (!cancelled) {
          // socialApi.get wraps the response in {success, data, meta};
          // the actual stats payload is response.data per the
          // social_bp _ok() helper.
          const payload = r?.data?.data || r?.data || r;
          setStats(payload);
        }
      } catch (e) {
        if (!cancelled) setStats({by_code: {}, total: 0});
      }
      if (!cancelled) setLoading(false);
    };
    load();
    const interval = setInterval(load, 30000);  // refresh 30s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <Card sx={cardStyle}>
        <CardContent sx={{p: 3}}>
          <Skeleton variant="text" width={140}
            sx={{bgcolor: 'rgba(255,255,255,0.05)'}} />
          <Skeleton variant="text" width={80} height={40}
            sx={{bgcolor: 'rgba(255,255,255,0.05)'}} />
          <Skeleton variant="rounded" height={60} sx={{
            bgcolor: 'rgba(255,255,255,0.05)', mt: 2,
          }} />
        </CardContent>
      </Card>
    );
  }

  const byCode = stats?.by_code || {};
  const total = stats?.total || 0;
  const leader = pickLeader(byCode);
  const totalDownloads = Object.values(byCode).reduce(
    (a, b) => a + (b?.download || 0), 0);
  const totalClicks = Object.values(byCode).reduce(
    (a, b) => a + (b?.click || 0), 0);

  // Sort channels by downloads desc for the compact table
  const rows = Object.entries(byCode)
    .sort(([, a], [, b]) => (b?.download || 0) - (a?.download || 0))
    .slice(0, 4);

  return (
    <Card sx={cardStyle}>
      <CardContent sx={{p: 3}}>
        <Stack direction="row" alignItems="center" spacing={2}
          sx={{mb: 2}}>
          <Box sx={iconContainerStyle}>
            <TrendingUpIcon sx={{color: '#9B94FF', fontSize: 24}} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Marketing funnel
            </Typography>
            <Typography variant="h5"
              sx={{color: '#fff', fontWeight: 700}}>
              {totalDownloads} downloads
            </Typography>
            <Typography variant="caption"
              sx={{color: 'rgba(255,255,255,0.4)'}}>
              {totalClicks} total clicks · {total} events
            </Typography>
          </Box>
        </Stack>

        {leader && leader.downloads > 0 && (
          <Tooltip title={`Top channel by downloads: ${leader.code}`}>
            <Box sx={{
              p: 1, mb: 1.5,
              background: 'rgba(108, 99, 255, 0.1)',
              borderRadius: 1.5,
            }}>
              <Typography variant="caption" sx={{color: '#9B94FF'}}>
                Leading channel: <strong>{leader.code}</strong>{' '}
                ({leader.downloads} downloads,{' '}
                {leader.clicks} clicks)
              </Typography>
            </Box>
          </Tooltip>
        )}

        {rows.length === 0 ? (
          <Typography variant="caption" sx={{
            color: 'rgba(255,255,255,0.4)',
            fontStyle: 'italic',
          }}>
            No clicks yet. Post via /api/social/marketing/intents
            and click traffic will appear here.
          </Typography>
        ) : (
          <Box sx={{display: 'grid', gap: 0.5}}>
            {rows.map(([code, row]) => (
              <Stack key={code} direction="row"
                justifyContent="space-between"
                sx={{
                  py: 0.5,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                <Typography variant="body2"
                  sx={{color: 'rgba(255,255,255,0.7)'}}>
                  {code}
                </Typography>
                <Typography variant="body2"
                  sx={{color: 'rgba(255,255,255,0.5)'}}>
                  {row?.click || 0}c · {row?.download || 0}d ·{' '}
                  {row?.signup || 0}s
                </Typography>
              </Stack>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
