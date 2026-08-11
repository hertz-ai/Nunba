/* eslint-disable */
import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import SeoHeader from './SeoHeader';
import SeoFooter from './SeoFooter';

// Shared scaffold for public SEO surfaces (/news, /listings, …): site header,
// dark shell, gradient page heading, footer. Keeps every public page visually
// identical and gives new surfaces one import instead of five.
export const GRADIENT_TEXT_SX = {
  fontWeight: 700,
  background: 'linear-gradient(135deg, #6C63FF, #FF6B6B)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

export default function PublicSeoPage({
  heading,
  headingVariant = 'h2',
  subheading,
  topSlot = null,
  maxWidth = 'lg',
  // Where the header's wordmark and "Home" link point.  Default '/' keeps the
  // nine existing consumers (News, Research, Listings, Incident, Answer, …)
  // byte-identical; Nunba's app-reachable pages pass '/local' so the only exit
  // from the page returns to the APP rather than leaving it.
  homeTo = '/',
  children,
}) {
  return (
    <>
      <SeoHeader homeTo={homeTo} />
      <Box sx={{ minHeight: '70vh', bgcolor: '#0F0E17', color: '#fff', pt: { xs: 6, md: 8 }, pb: 8 }}>
        <Container maxWidth={maxWidth}>
          {topSlot}
          <Typography component="h1" variant={headingVariant} sx={{ ...GRADIENT_TEXT_SX, mb: 2 }}>
            {heading}
          </Typography>
          {subheading && (
            <Typography variant="h6" sx={{ opacity: 0.7, mb: 6, maxWidth: 760 }}>
              {subheading}
            </Typography>
          )}
          {children}
        </Container>
      </Box>
      <SeoFooter />
    </>
  );
}
