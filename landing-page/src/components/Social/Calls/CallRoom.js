/**
 * CallRoom — Nunba web/desktop voice/video/screen-share surface.
 *
 * Phase 7d, plan reference: sunny-gliding-eich.md, Part J.1.
 *
 * Mirrors the RN CallChannelScreen contract:
 *   - GET /api/social/calls/:callId/token  → { mode, url, token }
 *   - mode === 'livekit'         → connect to SFU via livekit-client
 *   - mode === 'p2p_mesh'        → fall back to direct WebRTC mesh
 *                                  (handled by HARTOS signaling — for
 *                                  now this surface just renders the
 *                                  REST roster + a "running in mesh
 *                                  mode" banner, identical to mobile).
 *   - mode === 'livekit_pending' → infra-not-ready banner.
 *
 * Lazy-loaded `livekit-client` so the bundle works in builds without
 * the dep installed (jest tests, dev environments before npm install).
 */
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {
  Box, Typography, IconButton, Avatar, Stack, Chip, CircularProgress,
  useTheme, alpha,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CloseIcon from '@mui/icons-material/Close';
import {callsApi} from '../../../services/socialApi';

// Lazy-resolve livekit-client so jest + builds without the npm dep
// don't break.  Tests stub `__livekitForTest` on window for control.
const loadLiveKit = async () => {
  if (typeof window !== 'undefined' && window.__livekitForTest) {
    return window.__livekitForTest;
  }
  try {
    return await import('livekit-client');
  } catch (_) {
    return null;
  }
};

/* ── Render helpers ────────────────────────────────────────────── */

const initialsOf = (s) =>
  String(s || '').split(/\s+/).slice(0, 2)
    .map((p) => p[0] || '').join('').toUpperCase() || '?';

const ParticipantTile = ({p}) => {
  const theme = useTheme();
  const isAgent = p.agent_kind === 'agent';
  return (
    <Box
      sx={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 2,
        bgcolor: alpha(theme.palette.action.hover, 0.6),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        p: 1.5,
        outline: p.is_speaking
          ? `3px solid ${theme.palette.success.main}`
          : 'none',
        outlineOffset: -3,
      }}
    >
      <Avatar
        sx={{
          width: 56, height: 56,
          bgcolor: '#6C63FF33',
          color: '#6C63FF',
          fontWeight: 700,
        }}
      >
        {initialsOf(p.user_id || p.identity)}
      </Avatar>
      <Typography
        variant="caption"
        sx={{mt: 1, fontWeight: 600}}
        noWrap
      >
        {p.user_id?.slice(0, 8) || p.identity?.slice(0, 8) || 'Participant'}
      </Typography>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{mt: 0.5}}>
        {p.is_muted ? (
          <MicOffIcon sx={{fontSize: 12, color: 'text.disabled'}} />
        ) : null}
        {isAgent ? (
          <Chip
            size="small"
            label="agent"
            sx={{
              height: 18,
              fontSize: 10,
              fontWeight: 600,
              bgcolor: '#6C63FF',
              color: '#fff',
            }}
          />
        ) : null}
        {p.device_kind === 'agent_bridge' ? (
          <Typography variant="caption" sx={{fontSize: 10, color: 'text.secondary'}}>
            bridged
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
};

/* ── Routing helpers (exported for jest) ────────────────────────── */

export const decodeTokenResponse = (raw) => {
  if (!raw) return {mode: null, token: null, url: null};
  const data = (raw && raw.data) || raw;
  return {
    mode: data.mode || 'p2p_mesh',
    token: data.token || null,
    url: data.url || null,
  };
};

/* ── Page ──────────────────────────────────────────────────────── */

export default function CallRoom() {
  const {callId: paramCallId} = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [mode, setMode]                 = useState(null);
  const [token, setToken]               = useState(null);
  const [livekitUrl, setLivekitUrl]     = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [muted, setMuted]               = useState(false);
  const [videoOn, setVideoOn]           = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  const roomRef = useRef(null);
  const endedRef = useRef(false);

  // ── Token + roster fetch ────────────────────────────────────
  useEffect(() => {
    if (!paramCallId) {
      navigate(-1);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [tokenRes, callRes] = await Promise.all([
          callsApi.token(paramCallId, {can_publish: true}),
          callsApi.get(paramCallId),
        ]);
        if (cancelled) return;
        const decoded = decodeTokenResponse(tokenRes);
        setMode(decoded.mode);
        setToken(decoded.token);
        setLivekitUrl(decoded.url);
        const callData = (callRes && callRes.data) || callRes || {};
        setParticipants(callData.participants || []);
        try { await callsApi.join(paramCallId, {device_kind: 'web'}); } catch (_) {}
      } catch (_) {
        // Silent — UI shows fallback banner.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [paramCallId, navigate]);

  // ── Cleanup: leave on unmount ───────────────────────────────
  useEffect(() => () => {
    if (paramCallId && !endedRef.current) {
      callsApi.leave(paramCallId).catch(() => {});
    }
  }, [paramCallId]);

  // ── LiveKit lifecycle ───────────────────────────────────────
  useEffect(() => {
    if (mode !== 'livekit' || !token || !livekitUrl) return undefined;
    let cancelled = false;
    let room = null;
    (async () => {
      const lk = await loadLiveKit();
      if (cancelled || !lk || !lk.Room) return;
      try {
        room = new lk.Room({adaptiveStream: true, dynacast: true});
        roomRef.current = room;

        const refreshRoster = () => {
          if (cancelled || !room) return;
          const live = {};
          try {
            const remote = [...(room.remoteParticipants?.values?.() || [])];
            for (const p of remote) {
              live[p.identity || p.sid] = {
                is_muted: !!(p.isMicrophoneEnabled === false
                  || (p.audioTrackPublications &&
                      [...p.audioTrackPublications.values()][0]?.isMuted)),
                is_speaking: Boolean(p.isSpeaking),
              };
            }
            const lp = room.localParticipant;
            if (lp) {
              live[lp.identity || lp.sid] = {
                is_muted: muted,
                is_speaking: Boolean(lp.isSpeaking),
              };
            }
          } catch (_) { /* best effort */ }
          setParticipants((prev) => prev.map((p) => {
            const k = p.user_id || p.id || p.identity;
            const delta = live[k];
            return delta ? {...p, ...delta} : p;
          }));
        };

        if (lk.RoomEvent) {
          room.on(lk.RoomEvent.ParticipantConnected, refreshRoster);
          room.on(lk.RoomEvent.ParticipantDisconnected, refreshRoster);
          room.on(lk.RoomEvent.TrackMuted, refreshRoster);
          room.on(lk.RoomEvent.TrackUnmuted, refreshRoster);
          room.on(lk.RoomEvent.ActiveSpeakersChanged, refreshRoster);
        }

        await room.connect(livekitUrl, token, {autoSubscribe: true});
        if (cancelled) return;
        try { await room.localParticipant?.setMicrophoneEnabled?.(!muted); } catch (_) {}
        try { await room.localParticipant?.setCameraEnabled?.(videoOn); } catch (_) {}
        refreshRoster();
      } catch (_) {
        roomRef.current = null;
        room = null;
      }
    })();
    return () => {
      cancelled = true;
      if (room) {
        try { room.disconnect(); } catch (_) {}
      }
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token, livekitUrl]);

  // ── Controls ────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    setMuted((m) => !m);
    const r = roomRef.current;
    if (r && r.localParticipant) {
      try { await r.localParticipant.setMicrophoneEnabled(muted); } catch (_) {}
      // (if currently muted, the toggle turns mic ON → setMicrophoneEnabled(true)
      //  which is `!muted` AFTER the flip; the local state hasn't latched yet
      //  so we pass `muted` (= the value about to flip from) to flip ON.)
    }
  }, [muted]);

  const toggleVideo = useCallback(async () => {
    setVideoOn((v) => !v);
    const r = roomRef.current;
    if (r && r.localParticipant) {
      try { await r.localParticipant.setCameraEnabled(!videoOn); } catch (_) {}
    }
  }, [videoOn]);

  const toggleScreen = useCallback(async () => {
    const wasSharing = screenSharing;
    setScreenSharing((s) => !s);
    const r = roomRef.current;
    if (!r || !r.localParticipant) return;
    if (!wasSharing) {
      // Browser surfaces getDisplayMedia under the hood — LiveKit's
      // setScreenShareEnabled wraps it.
      try { await r.localParticipant.setScreenShareEnabled(true); }
      catch (_) { setScreenSharing(false); }
    } else {
      try { await r.localParticipant.setScreenShareEnabled(false); } catch (_) {}
    }
  }, [screenSharing]);

  const handleHangup = useCallback(async () => {
    endedRef.current = true;
    try { await callsApi.leave(paramCallId); } catch (_) {}
    if (roomRef.current) {
      try { roomRef.current.disconnect(); } catch (_) {}
    }
    navigate(-1);
  }, [paramCallId, navigate]);

  // ── Banners ────────────────────────────────────────────────
  const banner = useMemo(() => {
    if (mode === 'livekit') return null;
    if (mode === 'livekit_pending') {
      return 'Voice infra is configured but not yet ready (livekit-api SDK pending).';
    }
    if (mode === 'p2p_mesh') {
      return 'Running in P2P mesh mode — clients connect directly via PeerLink.';
    }
    return null;
  }, [mode]);

  if (loading) {
    return (
      <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320}}>
        <CircularProgress sx={{color: '#6C63FF'}} />
      </Box>
    );
  }

  return (
    <Box sx={{maxWidth: 960, mx: 'auto', py: 3, px: {xs: 1, sm: 2}}}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{mb: 2}}>
        <IconButton onClick={handleHangup} aria-label="Close">
          <CloseIcon />
        </IconButton>
        <Typography variant="h5" sx={{flex: 1, fontWeight: 700}}>
          Call · {participants.length} participant{participants.length === 1 ? '' : 's'}
        </Typography>
      </Stack>

      {banner ? (
        <Box
          sx={{
            mb: 2, p: 1.5,
            border: '1px solid',
            borderColor: '#FFD740',
            bgcolor: '#FFD74022',
            borderRadius: 2,
            color: '#FFD740',
            fontSize: 14,
          }}
        >
          {banner}
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)'},
          mb: 3,
        }}
      >
        {participants.map((p) => (
          <ParticipantTile key={p.id || p.user_id || p.identity} p={p} />
        ))}
      </Box>

      <Stack direction="row" justifyContent="center" spacing={1.5}>
        <IconButton
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          sx={{
            bgcolor: muted ? '#3A2020' : alpha(theme.palette.action.hover, 0.6),
            color: muted ? '#FF6B6B' : 'inherit',
          }}
        >
          {muted ? <MicOffIcon /> : <MicIcon />}
        </IconButton>
        <IconButton
          onClick={toggleVideo}
          aria-label={videoOn ? 'Stop video' : 'Start video'}
          sx={{
            bgcolor: videoOn
              ? alpha(theme.palette.action.hover, 0.6)
              : '#3A2020',
            color: videoOn ? 'inherit' : '#FF6B6B',
          }}
        >
          {videoOn ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>
        <IconButton
          onClick={toggleScreen}
          aria-label={screenSharing ? 'Stop sharing' : 'Share screen'}
          sx={{
            bgcolor: screenSharing
              ? '#003D3A'
              : alpha(theme.palette.action.hover, 0.6),
            color: screenSharing ? '#3CB54E' : 'inherit',
          }}
        >
          {screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        </IconButton>
        <IconButton
          onClick={handleHangup}
          aria-label="Hang up"
          sx={{bgcolor: '#FF4757', color: '#fff', '&:hover': {bgcolor: '#FF3344'}}}
        >
          <CallEndIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}
