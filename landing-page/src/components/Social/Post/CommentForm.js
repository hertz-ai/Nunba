import {
  socialTokens,
  RADIUS,
  SHADOWS,
  EASINGS,
  GRADIENTS,
} from '../../../theme/socialTokens';

import {
  TextField,
  Button,
  CircularProgress,
  Box,
  useTheme,
} from '@mui/material';
import {alpha} from '@mui/material/styles';
import React, {useState} from 'react';

export default function CommentForm({
  onSubmit,
  placeholder = 'Write a comment...',
  autoFocus = false,
}) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasContent = text.trim().length > 0;

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        mb: 2,
        p: 1.5,
        borderRadius: RADIUS.md,
        ...socialTokens.glass.subtle(theme),
        transition: `all 0.25s ${EASINGS.smooth}`,
      }}
    >
      <TextField
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            borderRadius: RADIUS.sm,
            transition: `all 0.25s ${EASINGS.smooth}`,
            '& fieldset': {
              borderColor: alpha(theme.palette.common.white, 0.1),
              transition: `border-color 0.25s ${EASINGS.smooth}`,
            },
            '&:hover fieldset': {
              borderColor: alpha(theme.palette.primary.main, 0.3),
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`,
            },
          },
        }}
        variant="outlined"
        size="small"
        multiline
        rows={2}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
      />
      <Button
        variant="contained"
        size="small"
        onClick={handleSubmit}
        disabled={!hasContent || submitting}
        sx={{
          minWidth: 72,
          fontWeight: 600,
          borderRadius: RADIUS.sm,
          textTransform: 'none',
          transition: `all 0.25s ${EASINGS.smooth}`,
          ...(hasContent && !submitting
            ? {
                background: GRADIENTS.primary,
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  background: GRADIENTS.primaryHover,
                  transform: 'translateY(-1px)',
                  boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                },
              }
            : {
                background: alpha(theme.palette.common.white, 0.06),
                color: alpha(theme.palette.common.white, 0.3),
              }),
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: theme.palette.primary.main,
            outlineOffset: 2,
          },
        }}
      >
        {submitting ? <CircularProgress size={18} /> : 'Reply'}
      </Button>
    </Box>
  );
}
