/**
 * MultiplayerScoreboard — Live score comparison overlay for multiplayer games.
 *
 * Shows during gameplay:
 *   - Compact player avatars with live scores
 *   - Position indicator (1st, 2nd, etc.)
 *   - Animated score changes
 *
 * Shows after completion:
 *   - Full results with rankings
 *   - Winner celebration
 *   - Rematch button
 */

import KidsCharacter from './KidsCharacter';

import {kidsColors, kidsAnimations} from '../kidsTheme';

import {Box, Typography, Fade, Grow} from '@mui/material';
import React from 'react';

const RANK_EMOJIS = ['🥇', '🥈', '🥉', '4️⃣'];
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', kidsColors.textMuted];

/**
 * Compact inline scoreboard shown during gameplay.
 * Positioned absolutely at the top of the game area.
 */
export function LiveScoreBar({participants = [], scores = {}, currentUserId}) {
  if (participants.length < 2) return null;

  // Sort by score descending
  const ranked = [...participants]
    .map((p) => ({
      ...p,
      score: scores[p.id]?.correct || 0,
      total: scores[p.id]?.total || 0,
      streak: scores[p.id]?.streak || 0,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: {xs: 1, sm: 2},
          px: 2,
          py: 1,
          mb: 1.5,
          borderRadius: '16px',
          background: kidsColors.surfaceLight,
          border: `1px solid ${kidsColors.cardBorder}`,
        }}
      >
        {ranked.map((player, idx) => {
          const isMe = player.id === currentUserId;
          return (
            <Box
              key={player.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: '12px',
                background: isMe ? `${kidsColors.primary}15` : 'transparent',
                border: isMe
                  ? `1.5px solid ${kidsColors.primary}40`
                  : '1.5px solid transparent',
                transition: 'all 0.3s ease',
              }}
            >
              <KidsCharacter seed={`mp-${player.id}`} size={28} state="idle" />
              <Box sx={{textAlign: 'center'}}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: isMe ? kidsColors.primary : kidsColors.textPrimary,
                    lineHeight: 1,
                  }}
                >
                  {player.score}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    color: kidsColors.textMuted,
                    lineHeight: 1,
                  }}
                >
                  {isMe
                    ? 'You'
                    : (player.display_name || player.username || '').substring(
                        0,
                        6
                      )}
                </Typography>
              </Box>
              {idx === 0 && player.score > 0 && (
                <Typography sx={{fontSize: '0.9rem'}}>👑</Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Fade>
  );
}

/**
 * Full results screen shown after multiplayer game completion.
 */
export function MultiplayerResults({
  participants = [],
  scores = {},
  currentUserId,
  onRematch,
  onLeave,
}) {
  // Sort by score descending
  const ranked = [...participants]
    .map((p) => ({
      ...p,
      score: scores[p.id]?.correct || 0,
      total: scores[p.id]?.total || 0,
      streak: scores[p.id]?.streak || 0,
    }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  const isWinner = winner?.id === currentUserId;

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          textAlign: 'center',
          py: 3,
          px: 2,
          maxWidth: 480,
          mx: 'auto',
        }}
      >
        {/* Winner celebration */}
        <Box
          sx={{
            mb: 3,
            animation: 'celebrate 1s ease-in-out',
            ...kidsAnimations.celebrate,
          }}
        >
          <Box sx={{fontSize: '4rem', mb: 1}}>{isWinner ? '🏆' : '⭐'}</Box>
          <KidsCharacter
            seed={`winner-${winner?.id}`}
            state="celebrate"
            size={100}
          />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: kidsColors.textPrimary,
              mt: 1,
              background: isWinner ? kidsColors.gradientCelebration : 'none',
              WebkitBackgroundClip: isWinner ? 'text' : 'unset',
              WebkitTextFillColor: isWinner
                ? 'transparent'
                : kidsColors.textPrimary,
            }}
          >
            {isWinner
              ? 'You Won!'
              : `${winner?.display_name || 'Player 1'} Wins!`}
          </Typography>
        </Box>

        {/* Rankings */}
        <Box sx={{mb: 3}}>
          {ranked.map((player, idx) => {
            const isMe = player.id === currentUserId;
            return (
              <Grow in key={player.id} timeout={400 + idx * 200}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2,
                    py: 1.5,
                    mb: 1,
                    borderRadius: '16px',
                    background: isMe
                      ? `${kidsColors.primary}12`
                      : kidsColors.surfaceLight,
                    border: isMe
                      ? `2px solid ${kidsColors.primary}50`
                      : `1px solid ${kidsColors.cardBorder}`,
                  }}
                >
                  {/* Rank */}
                  <Typography
                    sx={{fontSize: '1.5rem', width: 36, textAlign: 'center'}}
                  >
                    {RANK_EMOJIS[idx] || `${idx + 1}`}
                  </Typography>

                  {/* Character avatar */}
                  <KidsCharacter
                    seed={`result-${player.id}`}
                    size={40}
                    state={idx === 0 ? 'celebrate' : 'idle'}
                  />

                  {/* Name */}
                  <Box sx={{flex: 1, textAlign: 'left'}}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: isMe
                          ? kidsColors.primary
                          : kidsColors.textPrimary,
                      }}
                    >
                      {isMe
                        ? 'You'
                        : player.display_name ||
                          player.username ||
                          `Player ${idx + 1}`}
                    </Typography>
                  </Box>

                  {/* Score */}
                  <Box sx={{textAlign: 'right'}}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        color: RANK_COLORS[Math.min(idx, 3)],
                      }}
                    >
                      {player.score}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        color: kidsColors.textMuted,
                      }}
                    >
                      / {player.total}
                    </Typography>
                  </Box>
                </Box>
              </Grow>
            );
          })}
        </Box>

        {/* Action buttons */}
        <Box sx={{display: 'flex', gap: 1.5, justifyContent: 'center'}}>
          {onRematch && (
            <Box
              component="button"
              onClick={onRematch}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '1rem',
                background: kidsColors.gradientPrimary,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: kidsColors.shadowPrimary,
              }}
            >
              🔄 Rematch
            </Box>
          )}
          {onLeave && (
            <Box
              component="button"
              onClick={onLeave}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: '16px',
                fontWeight: 600,
                fontSize: '1rem',
                background: 'transparent',
                border: `1.5px solid ${kidsColors.textMuted}`,
                color: kidsColors.textSecondary,
                cursor: 'pointer',
              }}
            >
              Back to Hub
            </Box>
          )}
        </Box>
      </Box>
    </Fade>
  );
}

export default {LiveScoreBar, MultiplayerResults};
