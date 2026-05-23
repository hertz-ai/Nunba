import { channelUserApi } from '../../services/socialApi';

import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box, Typography, Button, CircularProgress, Paper, TextField, ToggleButton,
  ToggleButtonGroup, Alert,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback, useEffect, useRef, useState } from 'react';


// Sister of QRPairingDisplay, but for channels that pair via an
// embedded subprocess gateway (currently WhatsApp via Baileys).  The
// QR string returned by GET /api/social/channels/<type>/qr is a real
// WhatsApp-Web pairing string — scan it from inside WhatsApp's
// "Linked Devices" UI.  The "Link with phone number" tab calls
// POST /<type>/pair-code and surfaces Baileys' 8-char code that the
// user types into WhatsApp's "Link with phone number" screen instead
// of scanning a QR.  See HARTOS #225 for why this is separate from
// the Hevolve device-pair flow at QRPairingDisplay.
const POLL_INTERVAL_MS = 3000;

export default function GatewayQRDisplay({ channelType, displayName, onPaired }) {
  const [mode, setMode] = useState('qr');  // 'qr' | 'code'
  const [qr, setQr] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [state, setState] = useState('connecting');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [requestingCode, setRequestingCode] = useState(false);
  const pollRef = useRef(null);
  const pairedCalledRef = useRef(false);

  const fetchQr = useCallback(async () => {
    try {
      const res = await channelUserApi.gatewayQr(channelType);
      const data = res?.data?.data;
      if (!data) {
        setError(res?.data?.error || 'Gateway returned no data');
        return;
      }
      setQr(data.qr || null);
      setAuthenticated(!!data.authenticated);
      setState(data.state || 'unknown');
      setAccountId(data.account_id || '');
      setError('');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to reach WhatsApp gateway';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [channelType]);

  // Poll while not yet authenticated.  We rely on the polling result —
  // not a manual "I scanned!" button — so iOS / Android / Web see the
  // same flow.  Single source of truth for paired status is the
  // gateway's own session state.
  useEffect(() => {
    fetchQr();
    pollRef.current = setInterval(() => {
      fetchQr();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchQr]);

  useEffect(() => {
    if (authenticated && !pairedCalledRef.current) {
      pairedCalledRef.current = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (onPaired) {
        onPaired({ token: accountId, code: accountId, account_id: accountId });
      }
    }
  }, [authenticated, accountId, onPaired]);

  const requestCode = useCallback(async () => {
    if (!phone.trim()) {
      setError('Enter your WhatsApp phone number in E.164 format (e.g. +91 90030 54371).');
      return;
    }
    setRequestingCode(true);
    setError('');
    try {
      const res = await channelUserApi.gatewayPairCode(channelType, { phone: phone.trim() });
      const code = res?.data?.data?.code;
      if (code) {
        setPairCode(code);
      } else {
        setError(res?.data?.error || 'Gateway did not return a pair code');
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'pair-code request failed';
      setError(msg);
    } finally {
      setRequestingCode(false);
    }
  }, [channelType, phone]);

  const stateColor = authenticated ? '#00e89d' : (state === 'connecting' ? '#FFD966' : 'rgba(255,255,255,0.5)');

  return (
    <Paper sx={{
      p: 3,
      bgcolor: 'rgba(15,14,23,0.95)',
      borderRadius: '12px',
      textAlign: 'center',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#fff' }}>
        Link {displayName || 'WhatsApp'}
      </Typography>

      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, v) => v && setMode(v)}
        size="small"
        sx={{
          mb: 2,
          '& .MuiToggleButton-root': {
            color: 'rgba(255,255,255,0.7)',
            borderColor: 'rgba(255,255,255,0.15)',
            textTransform: 'none',
            px: 2,
          },
          '& .Mui-selected': {
            color: '#fff !important',
            bgcolor: 'rgba(108,99,255,0.25) !important',
          },
        }}
      >
        <ToggleButton value="qr">Scan QR</ToggleButton>
        <ToggleButton value="code">Link with phone number</ToggleButton>
      </ToggleButtonGroup>

      {authenticated && (
        <Alert severity="success" sx={{ mt: 1, mb: 2, bgcolor: 'rgba(0,232,157,0.1)', color: '#00e89d' }}>
          Linked. You can close this dialog.
        </Alert>
      )}

      {!authenticated && mode === 'qr' && (
        <>
          {loading && !qr && (
            <CircularProgress sx={{ color: '#6C63FF', my: 4 }} />
          )}
          {qr && (
            <Box sx={{ bgcolor: '#fff', borderRadius: '8px', display: 'inline-block', p: 2, my: 2 }}>
              <QRCodeSVG value={qr} size={200} />
            </Box>
          )}
          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.6)', mt: 1 }}>
            Open WhatsApp on your phone → Settings → Linked Devices → Link a Device.
          </Typography>
        </>
      )}

      {!authenticated && mode === 'code' && (
        <Box sx={{ textAlign: 'left', mt: 1 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
            In WhatsApp → Settings → Linked Devices → Link a Device → tap &ldquo;Link with phone number&rdquo;.
          </Typography>
          <TextField
            fullWidth
            label="Your WhatsApp number (E.164)"
            placeholder="+91 90030 54371"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={requestingCode || !!pairCode}
            size="small"
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
            }}
          />
          {!pairCode && (
            <Button
              fullWidth
              variant="contained"
              onClick={requestCode}
              disabled={requestingCode}
              sx={{ mt: 2, bgcolor: '#6C63FF', textTransform: 'none' }}
            >
              {requestingCode ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Get pairing code'}
            </Button>
          )}
          {pairCode && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
                Enter this in WhatsApp:
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: 'monospace',
                  color: '#00e89d',
                  letterSpacing: 4,
                  my: 1,
                  userSelect: 'all',
                }}
              >
                {pairCode}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Code expires after ~60 seconds. If it doesn&apos;t work, tap Refresh.
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: stateColor }}>
          {authenticated ? '● Linked' : `● ${state}`}
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            setPairCode('');
            fetchQr();
          }}
          size="small"
          sx={{ color: '#6C63FF', textTransform: 'none' }}
        >
          Refresh
        </Button>
      </Box>
    </Paper>
  );
}
