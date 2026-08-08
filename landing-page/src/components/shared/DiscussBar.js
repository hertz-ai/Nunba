import React from 'react';
import { useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ForumIcon from '@mui/icons-material/Forum';
import ShareIcon from '@mui/icons-material/Share';
import ShareDialog from '../Social/shared/ShareDialog';
import { postsApi } from '../../services/socialApi';

/**
 * DiscussBar — three ways to take a page further, all on existing machinery.
 *
 * Research papers, news stories and market pages have the same problem: a
 * reader finishes and leaves, because reading was the only thing on offer.
 * These are the three things someone actually wants next, and none of them
 * needed new infrastructure:
 *
 *   personal   → the agent chat at /social/agent/:id/chat, seeded with this
 *                item so the conversation starts where the reader is
 *   group      → postsApi.create, the same community post any member writes
 *   elsewhere  → ShareDialog, which already handles X / LinkedIn / Reddit /
 *                WhatsApp / email / QR / embed
 *
 * Deliberately NOT a fourth share implementation. ShareDialog is 334 lines
 * that already work; a second one would drift from it and nobody would know
 * which produced a given link.
 *
 * `seed` is the sentence the brainstorm opens with. It is written per
 * surface rather than generated, because a good opening question is specific
 * to what the reader just read — "what would falsify this?" suits a paper,
 * "who is exposed to this?" suits a market move.
 */
export default function DiscussBar({
  title,
  url,
  seed,
  agentId = 'default',
  sx,
}) {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [posting, setPosting] = React.useState(false);

  const brainstorm = () => {
    // The agent page reads `seed` from the query string. Encoded because it
    // is a sentence, not a slug.
    navigate(
      `/social/agent/${encodeURIComponent(agentId)}/chat?seed=${encodeURIComponent(
        seed || `Let's think about "${title}".`
      )}`
    );
  };

  const discussInCommunity = async () => {
    setPosting(true);
    try {
      await postsApi.create({
        content: `${seed || `Worth discussing: "${title}".`}\n\n${url}`,
        link_url: url,
        title,
      });
      setToast({ severity: 'success', msg: 'Posted. Open Social to discuss it.' });
    } catch (e) {
      // A failed post must say so. Silently swallowing it would leave the
      // reader believing a discussion exists that does not.
      setToast({
        severity: 'error',
        msg: e?.response?.status === 401
          ? 'Sign in to post this to a community.'
          : 'Could not post right now. Nothing was created.',
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={sx}>
        <Button size="small" variant="outlined" startIcon={<PsychologyIcon />}
                onClick={brainstorm}>
          Brainstorm with your agent
        </Button>
        <Button size="small" variant="outlined" startIcon={<ForumIcon />}
                onClick={discussInCommunity} disabled={posting}>
          {posting ? 'Posting…' : 'Discuss as a community post'}
        </Button>
        <Button size="small" variant="outlined" startIcon={<ShareIcon />}
                onClick={() => setShareOpen(true)}>
          Share
        </Button>
      </Stack>

      {shareOpen && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={title}
          url={url}
        />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)}>
            {toast.msg}
          </Alert>
        ) : null}
      </Snackbar>
    </>
  );
}
