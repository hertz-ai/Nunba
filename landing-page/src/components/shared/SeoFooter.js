/* eslint-disable */
import React from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// Self-contained dark footer for the public SEO surfaces (PublicSeoPage).
// The legacy marketing footer (footer-light.js) depends on Bootstrap grid CSS
// and a theme stylesheet that were never committed, so it collapses to an
// unstyled stack on these pages. This footer needs only MUI, matches the dark
// page aesthetic, and keeps the internal links that help crawlers.
const COLUMNS = [
  {
    heading: 'Explore',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Answers', to: '/answers' },
      { label: 'Research', to: '/research' },
      { label: 'News', to: '/news' },
      { label: 'Incidents', to: '/incidents' },
      { label: 'Listings', to: '/listings' },
      { label: 'Blog', to: '/blog' },
      { label: 'Download Nunba', to: '/download' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Hevolve', to: '/aboutus' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Press & Media', to: '/press' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms & Conditions', to: '/termsandconditions' },
      { label: 'Refund Policy', to: '/refundsandcancellations' },
    ],
  },
];

const linkSx = {
  color: 'rgba(255,255,255,0.62)',
  textDecoration: 'none',
  fontSize: '0.9rem',
  transition: 'color 0.2s',
  '&:hover': { color: '#fff' },
};

export default function SeoFooter() {
  const year = new Date().getFullYear();
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#0B0A12',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        color: '#fff',
        py: { xs: 5, md: 7 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand column */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Hevolve AI
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 320, lineHeight: 1.7 }}>
              Local-first, self-evolving multimodal AI agents. Build them by talking, run them
              on your own machine.
            </Typography>
          </Grid>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <Grid item xs={6} sm={4} md={Math.floor(8 / COLUMNS.length)} key={col.heading}>
              <Typography
                variant="subtitle2"
                sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, mb: 1.5, letterSpacing: 0.5 }}
              >
                {col.heading}
              </Typography>
              <Stack spacing={1}>
                {col.links.map((l) => (
                  <Box component={Link} to={l.to} key={l.to} sx={linkSx}>
                    {l.label}
                  </Box>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Box
          sx={{
            mt: { xs: 4, md: 6 },
            pt: 3,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { sm: 'center' },
            gap: 1.5,
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
            {year} © HertzAI Pvt Ltd. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Box component="a" href="https://github.com/hertz-ai/Nunba" target="_blank" rel="noopener noreferrer" sx={linkSx}>
              GitHub
            </Box>
            <Box component="a" href="https://twitter.com/AiHertz" target="_blank" rel="noopener noreferrer" sx={linkSx}>
              Twitter
            </Box>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
