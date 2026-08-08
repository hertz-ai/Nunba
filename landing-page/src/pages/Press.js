/* eslint-disable */
import React from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import HeaderNano from './Layouts/header';
import FooterLight from './Layouts/footer-light';
// Imported, not redeclared. See src/config/downloads.js. Press coverage is
// exactly the traffic worth attributing, and this bypassed /go/ entirely.
//
// The comment above once stood alone with no import under it, and the file's
// `/* eslint-disable */` turned no-undef off, so the build passed and the page
// threw at render. /press was a blank white screen for journalists, and the
// prerenderer skipped it every run with "did not finish rendering", which was
// the only visible symptom. See the note in Join.js, same mistake.
import { NUNBA_DOWNLOAD_URL } from '../config/downloads';
import PageMeta from '../components/shared/PageMeta';

const ONE_LINERS = [
  'Local-first multimodal AI agent. Voice + vision + chat + 31 channel integrations. Free, no subscription, open source.',
  'A 4B-parameter LLM that runs on your laptop and feels like a frontier API, thanks to a speculative decoding pair (4B main + 0.8B draft).',
  'Privacy-by-design AI: your data never leaves your machine unless you explicitly send it.',
  'Federated, not federated-marketing: nodes pool compute and share learnings via deltas. Raw data never crosses devices.',
  'Constitutional safety filter on every auto-improvement. Safety > sovereignty > realtime > throughput.',
];

const KEY_NUMBERS = [
  { label: 'First-token latency', value: '~700ms', context: '8GB RAM laptop, integrated graphics' },
  { label: 'Sustained throughput', value: '~12 tok/s', context: 'CPU-only fallback' },
  { label: 'With modest GPU', value: '~35 tok/s', context: 'GTX 1660, 6GB VRAM' },
  { label: 'Channel adapters', value: '31', context: 'Discord, Slack, Telegram, WhatsApp, Teams, Matrix, Reddit, …' },
  { label: 'Local TTS engines', value: '6', context: 'F5, Kokoro, Indic Parler, CosyVoice, Chatterbox, Piper (CPU)' },
  { label: 'Subscription cost', value: '$0 / mo', context: 'Free forever, source on GitHub' },
];

const QUOTES_FROM_FOUNDER = [
  '"The AI economy that treats your private conversations as training material for somebody else\'s quarterly numbers is a dead end. The AI that amplifies you, learns with you, and belongs to you: that\'s the future I want to build with."',
  '"Local-first isn\'t a feature flag. It\'s the only architecture where the user is the customer instead of the inventory."',
  '"Speculative decoding is what made \'good enough\' actually achievable on 8GB. We didn\'t cut quality. We changed the math."',
];

function Press() {
  return (
    <>
      <PageMeta
        title="Press &amp; Media Kit for Nunba | Hevolve AI"
        description="Press resources for Nunba, the local-first multimodal AI agent. Logo, screenshots, one-liners, key numbers, founder quotes, and contact for embargoed previews."
        ogTitle="Press &amp; Media Kit for Nunba"
        ogDescription="Logo, screenshots, one-liners, key numbers and founder quotes for Nunba, the local-first multimodal AI agent."
        path="/press"
        noindex
      />
      <HeaderNano />
      <Box sx={{ minHeight: '70vh', bgcolor: '#0F0E17', color: '#fff', pt: { xs: 12, md: 16 }, pb: 8 }}>
        <Container maxWidth="lg">
          <Typography
            component="h1"
            variant="h2"
            sx={{
              fontWeight: 700,
              mb: 2,
              background: 'linear-gradient(135deg, #6C63FF, #FF6B6B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Press &amp; Media Kit
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.78, mb: 6, maxWidth: 740 }}>
            Everything you need to write about Nunba. If you need anything not here, such as an embargoed preview, a founder interview, or a specific screenshot, email <a href="mailto:press@hevolve.ai" style={{ color: '#FF6B6B' }}>press@hevolve.ai</a>. We respond within 24 hours.
          </Typography>

          {/* Quick links / downloads */}
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Quick links</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 6, flexWrap: 'wrap' }}>
            <Button
              component="a"
              href={NUNBA_DOWNLOAD_URL}
              variant="contained"
              sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              ⬇ Signed installer (Windows)
            </Button>
            <Button
              component="a"
              href="https://github.com/hertz-ai/Nunba"
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              sx={{ borderColor: '#6C63FF', color: '#fff', '&:hover': { borderColor: '#FF6B6B', bgcolor: 'rgba(108,99,255,0.08)' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Source on GitHub
            </Button>
            <Button
              component={Link}
              to="/blog/run-local-ai-on-8gb-ram"
              variant="outlined"
              sx={{ borderColor: '#6C63FF', color: '#fff', '&:hover': { borderColor: '#FF6B6B', bgcolor: 'rgba(108,99,255,0.08)' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Architecture writeup
            </Button>
            <Button
              component={Link}
              to="/download"
              variant="outlined"
              sx={{ borderColor: '#6C63FF', color: '#fff', '&:hover': { borderColor: '#FF6B6B', bgcolor: 'rgba(108,99,255,0.08)' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Product page
            </Button>
          </Stack>

          {/* One-liners — for whichever frames the journalist needs */}
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>One-liners (pick the framing that fits)</Typography>
          <Stack spacing={1.5} sx={{ mb: 6 }}>
            {ONE_LINERS.map((line, i) => (
              <Box key={i} sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.18)' }}>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.92)' }}>{line}</Typography>
              </Box>
            ))}
          </Stack>

          {/* Key numbers */}
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Key numbers</Typography>
          <Grid container spacing={2} sx={{ mb: 6 }}>
            {KEY_NUMBERS.map((n) => (
              <Grid item xs={12} sm={6} md={4} key={n.label}>
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.22)', height: '100%' }}>
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{n.label}</Typography>
                  <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, my: 1 }}>{n.value}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>{n.context}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Quotes */}
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Founder quotes (attribute to Sathish Balasubramanian, Founder, Hevolve AI)</Typography>
          <Stack spacing={2} sx={{ mb: 6 }}>
            {QUOTES_FROM_FOUNDER.map((q, i) => (
              <Box key={i} sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.18)' }}>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.92)', fontStyle: 'italic' }}>{q}</Typography>
              </Box>
            ))}
          </Stack>

          {/* Boilerplate */}
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Standard boilerplate (paste verbatim)</Typography>
          <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.18)', mb: 6 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.84)', whiteSpace: 'pre-wrap' }}>
{`Hevolve AI builds Nunba, a local-first multimodal AI agent that runs entirely on the user's machine. Voice, vision, chat, and 31 channel integrations (Discord, Slack, Telegram, WhatsApp, Teams, Matrix, Reddit, and more). Free, no subscription, open source.

Nunba pairs Qwen3-4B (main) with Qwen3-0.8B (draft) via llama.cpp speculative decoding for ~700ms first-token latency on 8GB-RAM laptops. F5 / Kokoro / Indic Parler / CosyVoice / Piper for speech synthesis. Whisper for STT. MiniCPM-V for vision. Federated learning with constitutional safety on every auto-improvement.

Founded 2024. Source on GitHub: github.com/hertz-ai/Nunba`}
            </Typography>
          </Box>

          {/* Contact */}
          <Box sx={{ mt: 8, p: 4, borderRadius: 3, bgcolor: 'rgba(108,99,255,0.10)', border: '1px solid #6C63FF', textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>Need something not here?</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              Embargoed preview, founder interview, specific screenshot, technical deep-dive. We respond within 24 hours.
            </Typography>
            <Button
              component="a"
              href="mailto:press@hevolve.ai"
              variant="contained"
              sx={{ bgcolor: '#6C63FF', '&:hover': { bgcolor: '#5A52E0' }, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              press@hevolve.ai
            </Button>
          </Box>
        </Container>
      </Box>
      <FooterLight />
    </>
  );
}

export default Press;
