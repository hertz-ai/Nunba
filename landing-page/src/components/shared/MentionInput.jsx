/**
 * MentionInput — universal @-mention autocomplete for the Nunba web UI.
 *
 * Mirrors components/shared/MentionInput.js in Hevolve_RN (and the iOS
 * vendor of same).  Same `mentionsApi.autocomplete` endpoint; same
 * scope shape ({kind, community_id, conversation_id, limit}); same
 * 200ms debounce; same "human vs agent" badge convention so the UX
 * feels identical across surfaces.  Drop-in TextField replacement —
 * accepts the same value/onChange/multiline/placeholder/sx props as
 * @mui/material TextField.
 */
import React, {useState, useCallback, useEffect, useRef, useMemo} from 'react';
import {
  TextField,
  Popper,
  Paper,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Box,
  Chip,
  ClickAwayListener,
} from '@mui/material';
import {mentionsApi} from '../../services/socialApi';

const USERNAME_RX = /(?:^|\s)@([a-zA-Z0-9_.-]{1,40})$/;
const DEBOUNCE_MS = 200;
const MAX_RESULTS = 10;

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function MentionInput({
  value,
  onChange,
  onMentionsChange,
  scope = {},
  placeholder = "What's on your mind?",
  multiline = true,
  minRows = 2,
  maxRows = 8,
  sx,
  ...rest
}) {
  const inputRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [prefix, setPrefix] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [mentions, setMentions] = useState([]); // [{username, id}]

  const debouncedPrefix = useDebounced(prefix, DEBOUNCE_MS);

  // Detect `@<prefix>` near caret on every value change.
  const detectMention = useCallback(text => {
    const ref = inputRef.current;
    const caret = ref?.selectionStart ?? text.length;
    const upTo = text.slice(0, caret);
    const match = upTo.match(USERNAME_RX);
    if (match) {
      setPrefix(match[1]);
      setOpen(true);
      setAnchorEl(ref);
    } else {
      setPrefix('');
      setOpen(false);
    }
  }, []);

  const handleChange = useCallback(
    e => {
      const next = e.target.value;
      onChange?.(next);
      detectMention(next);
    },
    [onChange, detectMention],
  );

  // Fetch autocomplete results when debounced prefix changes.
  useEffect(() => {
    let cancelled = false;
    if (!debouncedPrefix) {
      setResults([]);
      return;
    }
    const limit = scope.limit ?? MAX_RESULTS;
    const params = {kind: 'all', limit, ...scope};
    mentionsApi
      .autocomplete(debouncedPrefix, params)
      .then(res => {
        if (cancelled) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        setResults(data.slice(0, limit));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPrefix, scope]);

  const insertMention = useCallback(
    user => {
      const ref = inputRef.current;
      if (!ref) return;
      const caret = ref.selectionStart ?? value.length;
      const upTo = value.slice(0, caret);
      const after = value.slice(caret);
      const replaced = upTo.replace(USERNAME_RX, m => {
        // Keep the leading whitespace (or start-of-string) the regex matched.
        const lead = m.startsWith(' ') ? ' ' : '';
        return `${lead}@${user.username} `;
      });
      const next = replaced + after;
      onChange?.(next);
      const nextMentions = [
        ...mentions.filter(m => m.username !== user.username),
        {username: user.username, id: user.id, kind: user.user_type || 'human'},
      ];
      setMentions(nextMentions);
      onMentionsChange?.(nextMentions);
      setOpen(false);
      setPrefix('');
    },
    [value, mentions, onChange, onMentionsChange],
  );

  const handleClickAway = useCallback(() => {
    setOpen(false);
  }, []);

  const popperOpen = open && results.length > 0 && Boolean(anchorEl);
  const renderedResults = useMemo(
    () =>
      results.map(u => {
        const isAgent = u.user_type === 'agent';
        const initial = (u.display_name || u.username || '?')[0].toUpperCase();
        return (
          <ListItemButton
            key={u.id || u.username}
            onClick={() => insertMention(u)}
            dense
            sx={{borderRadius: 1}}
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  bgcolor: isAgent ? '#6C63FF' : '#0078ff',
                  width: 32,
                  height: 32,
                  fontSize: 14,
                }}
              >
                {initial}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.75}}>
                  <span>{u.display_name || u.username}</span>
                  <Chip
                    label={isAgent ? 'agent' : 'person'}
                    size="small"
                    color={isAgent ? 'secondary' : 'default'}
                    sx={{height: 18, fontSize: 10}}
                  />
                </Box>
              }
              secondary={`@${u.username}`}
              primaryTypographyProps={{variant: 'body2', fontWeight: 600}}
              secondaryTypographyProps={{variant: 'caption'}}
            />
          </ListItemButton>
        );
      }),
    [results, insertMention],
  );

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{position: 'relative', width: '100%'}}>
        <TextField
          inputRef={inputRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          multiline={multiline}
          minRows={multiline ? minRows : undefined}
          maxRows={multiline ? maxRows : undefined}
          fullWidth
          sx={sx}
          inputProps={{'aria-autocomplete': 'list'}}
          {...rest}
        />
        <Popper
          open={popperOpen}
          anchorEl={anchorEl}
          placement="bottom-start"
          modifiers={[{name: 'offset', options: {offset: [0, 4]}}]}
          style={{zIndex: 9999, width: anchorEl?.offsetWidth ?? 'auto'}}
        >
          <Paper elevation={6} sx={{maxHeight: 280, overflowY: 'auto'}}>
            <List dense disablePadding>
              {renderedResults}
            </List>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
