/* eslint-disable */
import React from 'react';
import { NUNBA_DOWNLOAD_URL } from '../../config/downloads';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import HeaderNano from '../Layouts/header';
import FooterLight from '../Layouts/footer-light';
import { SOCIAL_API_URL } from '../../config/apiBase';
import PageMeta from '../../components/shared/PageMeta';

// Imported, not redeclared. This said it mirrored Download.js and Agent.js
// while pointing somewhere else entirely, so blog conversions were invisible.
// See src/config/downloads.js.

// Posts registry - slug, title, description, date, JS or markdown source.
// Keep this list as the single source of truth for /blog.  Add new
// entries here when new posts are added.  Same data feeds sitemap.xml
// at /public/sitemap.xml (manual mirror - no build step required).
const POSTS = [
  {
    slug: 'the-node-that-keeps-what-it-learns',
    title: 'The Node That Keeps What It Learns',
    description:
      'The learning engine inside HARTOS writes what it learns into its weights, on your machine, and still knows it tomorrow. Measured against fine-tuning and replay, with the numbers.',
    date: '2026-07-27',
    readingMinutes: 6,
  },
  {
    slug: 'reasoning-with-time-and-ai',
    title: 'Reasoning With Time: Why Self-Evolving AI Beats Static Models',
    description:
      'How Hevolve agents reason across time, refining their answers from cumulative experience rather than the snapshot of a frozen model.',
    date: '2026-04-12',
    readingMinutes: 7,
  },
  {
    slug: 'privacy-first-ai',
    title: 'Privacy-First AI: Local-First Multimodal Without the Cloud Tax',
    description:
      'Why Hevolve runs the entire chat / vision / voice loop on your machine, what we send to the cloud (almost nothing), and how the federated layer respects your data.',
    date: '2026-04-18',
    readingMinutes: 6,
  },
  {
    slug: 'run-local-ai-on-8gb-ram',
    title: 'How Nunba Runs a 4B LLM on 8GB RAM: Speculative Decoding Explained',
    description:
      'Speculative decoding + tiny draft model + quantized main model = local AI that\'s actually responsive on the laptop you already own. Here is exactly how the pipeline fits.',
    date: '2026-05-23',
    readingMinutes: 8,
  },
];

function BlogIndex() {
  // Pages published through the backend pages API (SitePage rows) merge in
  // ahead of the three legacy static posts. The static entries stay in the
  // registry above so their URLs and sitemap lines never depend on the API
  // being reachable; an API failure just means the list shows the legacy
  // three.
  const [apiPosts, setApiPosts] = React.useState([]);
  React.useEffect(() => {
    fetch(`${SOCIAL_API_URL}/pages`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body && body.success && Array.isArray(body.pages)) {
          setApiPosts(body.pages.map((pg) => ({
            slug: pg.slug,
            title: pg.title,
            description: pg.description || '',
            date: (pg.published_at || pg.created_at || '').slice(0, 10),
            readingMinutes: 5,
          })));
        }
      })
      .catch(() => {});
  }, []);
  const staticSlugs = new Set(POSTS.map((pg) => pg.slug));
  const allPosts = [
    ...apiPosts.filter((pg) => !staticSlugs.has(pg.slug)),
    ...POSTS,
  ];
  return (
    <>
      <PageMeta
        title="Hevolve Blog: Self-Evolving AI, Privacy-First, Local-First"
        description="Essays on self-evolving AI agents, privacy-first local models, and the Hevolve approach to giving every user their own intelligence."
        ogTitle="Hevolve Blog"
        ogDescription="Essays on self-evolving AI agents, privacy-first local models, and the Hevolve approach."
        path="/blog"
      >
        <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'Blog', name: 'Hevolve Blog', url: 'https://hevolve.ai/blog', publisher: { '@type': 'Organization', name: 'Hevolve AI', url: 'https://hevolve.ai', }, blogPost: POSTS.map((p) => ({ '@type': 'BlogPosting', headline: p.title, description: p.description, datePublished: p.date, url: `https://hevolve.ai/blog/${p.slug}`, })), })}</script>
      </PageMeta>
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
            Hevolve Blog
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.7, mb: 4, maxWidth: 700 }}>
            Essays on self-evolving agents, privacy-first AI, and giving every user their own intelligence.
          </Typography>
          {/* Conversion bar - visitors should be able to download from the
              blog index without scrolling to the home page. */}
          <Box sx={{ mb: 6, p: 3, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.10)', border: '1px solid #10b981', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Try Nunba yourself</Typography>
              <Typography variant="body2" sx={{ opacity: 0.74 }}>Free · Local-first · Runs on your machine, no cloud required.</Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                component="a"
                href={NUNBA_DOWNLOAD_URL}
                variant="contained"
                size="large"
                sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, borderRadius: 2, px: 3, fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                ⬇ Download for Windows
              </Button>
              <Button
                component={Link}
                to="/download"
                variant="outlined"
                size="large"
                sx={{ borderColor: '#10b981', color: '#10b981', borderRadius: 2, fontWeight: 600, textTransform: 'none', whiteSpace: 'nowrap', '&:hover': { borderColor: '#059669', bgcolor: 'rgba(16,185,129,0.06)' } }}
              >
                Details
              </Button>
            </Stack>
          </Box>
          <Grid container spacing={3}>
            {allPosts.map((post) => (
              <Grid item xs={12} md={6} key={post.slug}>
                <Card sx={{ bgcolor: 'rgba(108, 99, 255, 0.06)', border: '1px solid rgba(108, 99, 255, 0.18)', borderRadius: 3, height: '100%' }}>
                  <CardActionArea component={Link} to={`/blog/${post.slug}`} sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="caption" sx={{ color: '#FF6B6B', fontWeight: 600 }}>
                        {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · {post.readingMinutes} min read
                      </Typography>
                      <Typography component="h2" variant="h5" sx={{ color: '#fff', mt: 1, mb: 1.5, fontWeight: 600 }}>
                        {post.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.74)' }}>
                        {post.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      <FooterLight />
    </>
  );
}

export default BlogIndex;
export { POSTS };
