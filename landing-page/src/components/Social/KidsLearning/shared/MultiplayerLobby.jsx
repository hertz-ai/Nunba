/**
 * MultiplayerLobby — Game lobby UI for kids multiplayer games.
 *
 * Shows:
 *   - Animated waiting room with participant avatars (KidsCharacter)
 *   - Create / Join / Quick Match buttons
 *   - Live participant list with ready indicators
 *   - Start Game button (host only)
 *   - Session code for sharing
 *
 * Uses useMultiplayerSync hook for state management.
 */

import KidsCharacter from './KidsCharacter';

import {kidsColors, kidsAnimations} from '../kidsTheme';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Box,
  Typography,
  Button,
  Card,
  Fade,
  Grow,
  CircularProgress,
  Chip,
  TextField,
  IconButton,
} from '@mui/material';
import React, {useState, useCallback} from 'react';

/**
 * @param {Object} props
 * @param {Object} props.multiplayer - Return value from useMultiplayerSync
 * @param {Function} props.onStartSolo - Called when user chooses solo play
 * @param {Function} props.onGameStart - Called when multiplayer game starts
 * @param {string} props.gameTitle - Game display name
 */
export default function MultiplayerLobby({
  multiplayer,
  onStartSolo,
  onGameStart,
  gameTitle = 'Game',
}) {
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  const {
    sessionId,
    participants,
    isHost,
    gameStarted,
    status,
    error,
    createSession,
    joinSession,
    quickMatch,
    startGame,
    canStart,
    participantCount,
  } = multiplayer;

  // Copy session code to clipboard
  const handleCopyCode = useCallback(() => {
    if (sessionId) {
      navigator.clipboard?.writeText(sessionId).catch(() => {});
    }
  }, [sessionId]);

  // Handle join with code
  const handleJoin = useCallback(async () => {
    if (joinCode.trim()) {
      await joinSession(joinCode.trim());
    }
  }, [joinCode, joinSession]);

  // Notify parent when game starts
  React.useEffect(() => {
    if (gameStarted && onGameStart) {
      onGameStart();
    }
  }, [gameStarted, onGameStart]);

  // ── Waiting/Idle state — show mode selection ────────────────
  if (status === 'idle') {
    return (
      <Fade in timeout={400}>
        <Card
          elevation={0}
          sx={{
            background: kidsColors.cardBg,
            border: `1px solid ${kidsColors.cardBorder}`,
            borderRadius: '24px',
            boxShadow: kidsColors.shadowCard,
            p: {xs: 3, sm: 4},
            textAlign: 'center',
            maxWidth: 480,
            mx: 'auto',
          }}
        >
          {/* Animated characters */}
          <Box sx={{display: 'flex', justifyContent: 'center', gap: 2, mb: 3}}>
            <KidsCharacter seed="lobby-1" state="idle" size={64} />
            <KidsCharacter
              seed="lobby-2"
              state="idle"
              size={64}
              species="bunny"
            />
            <KidsCharacter
              seed="lobby-3"
              state="idle"
              size={64}
              species="bear"
            />
          </Box>

          <Typography
            variant="h5"
            sx={{fontWeight: 800, color: kidsColors.textPrimary, mb: 1}}
          >
            {gameTitle}
          </Typography>

          <Typography
            variant="body2"
            sx={{color: kidsColors.textSecondary, mb: 3}}
          >
            Play solo or challenge friends!
          </Typography>

          {error && (
            <Typography
              sx={{color: kidsColors.incorrect, mb: 2, fontSize: '0.9rem'}}
            >
              {error}
            </Typography>
          )}

          {/* Mode buttons */}
          <Box sx={{display: 'flex', flexDirection: 'column', gap: 1.5}}>
            {/* Solo Play */}
            <Button
              variant="contained"
              fullWidth
              onClick={onStartSolo}
              sx={{
                py: 2,
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '1.1rem',
                background: kidsColors.gradientPrimary,
                color: '#fff',
                boxShadow: kidsColors.shadowPrimary,
                textTransform: 'none',
              }}
            >
              🎮 Play Solo
            </Button>

            {/* Quick Match */}
            <Button
              variant="outlined"
              fullWidth
              onClick={quickMatch}
              sx={{
                py: 2,
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '1.1rem',
                borderColor: kidsColors.primary,
                color: kidsColors.primary,
                textTransform: 'none',
                '&:hover': {
                  background: `${kidsColors.primary}15`,
                },
              }}
            >
              ⚡ Quick Match
            </Button>

            {/* Create Room */}
            <Button
              variant="outlined"
              fullWidth
              onClick={() => createSession(4)}
              sx={{
                py: 2,
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '1rem',
                borderColor: kidsColors.teal,
                color: kidsColors.teal,
                textTransform: 'none',
                '&:hover': {
                  background: `${kidsColors.teal}15`,
                },
              }}
            >
              🏠 Create Room
            </Button>

            {/* Join with Code */}
            {!showJoinInput ? (
              <Button
                variant="text"
                fullWidth
                onClick={() => setShowJoinInput(true)}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  color: kidsColors.textSecondary,
                  textTransform: 'none',
                }}
              >
                🔑 Join with Code
              </Button>
            ) : (
              <Box sx={{display: 'flex', gap: 1}}>
                <TextField
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter room code..."
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleJoin}
                  disabled={!joinCode.trim()}
                  sx={{
                    borderRadius: '12px',
                    background: kidsColors.primary,
                    color: '#fff',
                    textTransform: 'none',
                    minWidth: 80,
                  }}
                >
                  Join
                </Button>
              </Box>
            )}
          </Box>
        </Card>
      </Fade>
    );
  }

  // ── Creating state ──────────────────────────────────────────
  if (status === 'creating') {
    return (
      <Fade in timeout={300}>
        <Box sx={{textAlign: 'center', py: 6}}>
          <CircularProgress size={48} sx={{color: kidsColors.primary, mb: 2}} />
          <Typography sx={{color: kidsColors.textSecondary, fontWeight: 600}}>
            Setting up game...
          </Typography>
        </Box>
      </Fade>
    );
  }

  // ── Waiting for players ─────────────────────────────────────
  if (status === 'waiting') {
    return (
      <Fade in timeout={400}>
        <Card
          elevation={0}
          sx={{
            background: kidsColors.cardBg,
            border: `1px solid ${kidsColors.cardBorder}`,
            borderRadius: '24px',
            boxShadow: kidsColors.shadowCard,
            p: {xs: 3, sm: 4},
            textAlign: 'center',
            maxWidth: 500,
            mx: 'auto',
          }}
        >
          {/* Animated waiting characters */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1.5,
              mb: 3,
              animation: 'pulse 2s infinite',
              ...kidsAnimations.pulse,
            }}
          >
            {participants.map((p, i) => (
              <Grow in key={p.id || i} timeout={300 + i * 200}>
                <Box sx={{textAlign: 'center'}}>
                  <KidsCharacter
                    seed={`player-${p.id || i}`}
                    state="idle"
                    size={60}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: kidsColors.textSecondary,
                      mt: 0.5,
                    }}
                  >
                    {p.display_name || p.username || `Player ${i + 1}`}
                  </Typography>
                </Box>
              </Grow>
            ))}
            {/* Empty slots */}
            {[...Array(Math.max(0, 4 - participants.length))].map((_, i) => (
              <Box
                key={`empty-${i}`}
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  border: `2px dashed ${kidsColors.textMuted}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.4,
                }}
              >
                <Typography sx={{fontSize: '1.5rem'}}>?</Typography>
              </Box>
            ))}
          </Box>

          <Typography
            variant="h6"
            sx={{fontWeight: 700, color: kidsColors.textPrimary, mb: 1}}
          >
            Waiting for players...
          </Typography>

          <Typography
            variant="body2"
            sx={{color: kidsColors.textSecondary, mb: 2}}
          >
            {participantCount} / 4 players joined
          </Typography>

          {/* Session code */}
          {sessionId && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 3,
                px: 2,
                py: 1,
                borderRadius: '12px',
                background: kidsColors.surfaceLight,
                border: `1px solid ${kidsColors.cardBorder}`,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: kidsColors.primary,
                  letterSpacing: 2,
                  fontFamily: 'monospace',
                }}
              >
                {String(sessionId).substring(0, 8).toUpperCase()}
              </Typography>
              <IconButton size="small" onClick={handleCopyCode}>
                <ContentCopyIcon
                  sx={{fontSize: 18, color: kidsColors.textMuted}}
                />
              </IconButton>
            </Box>
          )}

          {/* Start / Leave buttons */}
          <Box sx={{display: 'flex', gap: 1.5, justifyContent: 'center'}}>
            {isHost && (
              <Button
                variant="contained"
                disabled={!canStart}
                onClick={startGame}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: '16px',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  background: canStart
                    ? kidsColors.gradientCorrect
                    : kidsColors.surfaceLight,
                  color: canStart ? '#fff' : kidsColors.textMuted,
                  textTransform: 'none',
                  boxShadow: canStart ? kidsColors.shadowCorrect : 'none',
                }}
              >
                🚀 Start Game
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => {
                multiplayer.leaveSession();
              }}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: '16px',
                fontWeight: 600,
                borderColor: kidsColors.textMuted,
                color: kidsColors.textSecondary,
                textTransform: 'none',
              }}
            >
              Leave
            </Button>
          </Box>
        </Card>
      </Fade>
    );
  }

  // ── Playing / Complete states are handled by the parent ──────
  return null;
}
