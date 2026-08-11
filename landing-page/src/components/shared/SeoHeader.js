/* eslint-disable */
import React from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { GRADIENT_TEXT_SX } from './PublicSeoPage';

// Self-contained dark header for the public SEO surfaces (PublicSeoPage).
// The legacy marketing nav (header.js) is a light bar that depends on a theme
// stylesheet never committed to the repo, so it clashes on these dark pages.
// This header needs only MUI + react-router, matches the page, and keeps the
// key internal links plus the Download call to action.
// `homeTo` is a PARAMETER, not a constant, because Nunba and web disagree about
// what "home" means and both are right.  On web, `/` is the marketing root.  In
// the Nunba desktop app, an app-reachable page whose only exit is `/` throws the
// user OUT of the app — the same headless-dead-end defect in a subtler costume.
// Per the user's stated design intent (2026-08-11): `/` resolves online when
// available and degrades to `/local`, so `/local` is the safe home for
// Nunba-reachable pages.  Default stays '/' so all nine existing PublicSeoPage
// consumers render byte-identically.
const buildNav = (homeTo) => [
  { label: 'Home', to: homeTo },
  { label: 'News', to: '/news' },
  { label: 'Research', to: '/research' },
  { label: 'Listings', to: '/listings' },
  { label: 'Blog', to: '/blog' },
];

const navLinkSx = {
  color: 'rgba(255,255,255,0.72)',
  textDecoration: 'none',
  fontSize: '0.95rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  transition: 'color 0.2s',
  '&:hover': { color: '#fff' },
};

export default function SeoHeader({ homeTo = '/' }) {
  const NAV = buildNav(homeTo);
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        bgcolor: 'rgba(11,10,18,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            py: 1.5,
          }}
        >
          {/* Wordmark */}
          <Box component={Link} to={homeTo} sx={{ ...GRADIENT_TEXT_SX, fontSize: '1.35rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Hevolve AI
          </Box>

          {/* Center nav — hidden on the smallest screens to avoid overflow */}
          <Stack direction="row" spacing={3} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            {NAV.map((n) => (
              <Box component={Link} to={n.to} key={n.to} sx={navLinkSx}>
                {n.label}
              </Box>
            ))}
          </Stack>

          {/* Download CTA */}
          <Button
            component={Link}
            to="/download"
            variant="contained"
            sx={{
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              whiteSpace: 'nowrap',
            }}
          >
            ⬇ Download Nunba
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
