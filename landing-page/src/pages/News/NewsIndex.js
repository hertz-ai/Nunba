/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import PublicSeoPage from '../../components/shared/PublicSeoPage';
import { NEWS_ITEMS, formatNewsDate } from './newsData';
import { communitiesApi, feedApi } from '../../services/socialApi';
// Build-time snapshot from `npm run news:pull` (scripts/fetch-ai-news.js) —
// baked into the bundle so the headlines are crawlable, refreshed on rebuild.
import aiNewsDigest from '../../data/aiNewsDigest.json';
import PageMeta from '../../components/shared/PageMeta';
import { readPrerenderData, publishPrerenderData } from '../../utils/prerenderData';

// Category → accent color, matching the site's existing palette.
const CATEGORY_COLORS = {
  Release: '#10b981',
  Community: '#FF6B6B',
  Engineering: '#6C63FF',
  Company: '#FFAB00',
};

function NewsIndex() {
  // Live layer on top of the static registry: recent Nunba communities and
  // trending community posts. Public visitors get whatever the API serves
  // unauthenticated; on any failure the section simply doesn't render, so
  // the crawlable static content above is never blocked on the API.
  // Seeded from what the prerenderer fetched, so this page's first render
  // matches the saved HTML. Without it the file holds a list of communities and
  // the client's first render holds an empty one, which hydration cannot
  // reconcile and so throws the boundary away. Read in the initialiser, not an
  // effect: an effect arrives one render too late. See
  // src/utils/prerenderData.js.
  const seed = readPrerenderData('newsIndex') || {};
  const [communities, setCommunities] = useState(seed.communities || []);
  const [trending, setTrending] = useState(seed.trending || []);

  useEffect(() => {
    // Published as each half lands, and both halves are kept, so a slow or
    // failing one cannot wipe what the other already recorded.
    const publish = (patch) =>
      publishPrerenderData('newsIndex', {
        ...(readPrerenderData('newsIndex') || {}),
        ...patch,
      });
    communitiesApi
      .list({ limit: 8 })
      .then((res) => {
        setCommunities(res.data || []);
        publish({ communities: res.data || [] });
      })
      .catch(() => publish({ communities: [] }));
    feedApi
      .trending({ limit: 6 })
      .then((res) => {
        setTrending(res.data || []);
        publish({ trending: res.data || [] });
      })
      .catch(() => publish({ trending: [] }));
  }, []);

  return (
    <>
      <PageMeta
        title="Nunba News: Releases &amp; Community Updates | Hevolve AI"
        description="What's new in Nunba: releases, engineering deep-dives, and updates from the community. Local-first multimodal AI, straight from the people building it."
        ogTitle="Nunba News: Releases & Community Updates"
        ogDescription="What's new in Nunba: releases, engineering deep-dives, and updates from the community."
        path="/news"
      >
        <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Nunba News', url: 'https://hevolve.ai/news', publisher: { '@type': 'Organization', name: 'Hevolve AI', url: 'https://hevolve.ai' }, mainEntity: { '@type': 'ItemList', itemListElement: NEWS_ITEMS.map((n, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'NewsArticle', headline: n.title, description: n.description, datePublished: n.date, url: `https://hevolve.ai/news/${n.slug}`, author: { '@type': 'Organization', name: 'Hevolve AI' }, publisher: { '@type': 'Organization', name: 'Hevolve AI', url: 'https://hevolve.ai' }, }, })), }, })}</script>
      </PageMeta>
      <PublicSeoPage
        heading="Nunba News"
        subheading="Releases, engineering deep-dives, and updates from the Nunba community. This is the local-first multimodal AI agent, straight from the people building it."
      >
          {/* Static news registry — the crawlable SEO surface */}
          <Grid container spacing={3} sx={{ mb: 8 }}>
            {NEWS_ITEMS.map((item) => (
              <Grid item xs={12} md={6} key={item.slug}>
                <Card sx={{ bgcolor: 'rgba(108, 99, 255, 0.06)', border: '1px solid rgba(108, 99, 255, 0.18)', borderRadius: 3, height: '100%' }}>
                  <CardActionArea component={Link} to={`/news/${item.slug}`} sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                        <Chip
                          label={item.category}
                          size="small"
                          sx={{
                            bgcolor: `${CATEGORY_COLORS[item.category] || '#6C63FF'}22`,
                            color: CATEGORY_COLORS[item.category] || '#6C63FF',
                            fontWeight: 700,
                          }}
                        />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                          {formatNewsDate(item.date)}
                        </Typography>
                      </Stack>
                      <Typography component="h2" variant="h5" sx={{ color: '#fff', mb: 1.5, fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.74)' }}>
                        {item.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Live layer — sourced from Nunba community pages at runtime */}
          {communities.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography component="h2" variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                Nunba communities
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                {communities.map((c) => (
                  <Chip
                    key={c.id}
                    component={Link}
                    to={`/social/h/${c.id}`}
                    clickable
                    label={c.name || 'Community'}
                    sx={{
                      bgcolor: 'rgba(108,99,255,0.10)',
                      color: '#fff',
                      border: '1px solid rgba(108,99,255,0.30)',
                      fontWeight: 600,
                      '&:hover': { bgcolor: 'rgba(108,99,255,0.22)' },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {trending.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography component="h2" variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                Trending on Nunba right now
              </Typography>
              <Grid container spacing={2}>
                {trending.map((post) => (
                  <Grid item xs={12} sm={6} md={4} key={post.id}>
                    <Card sx={{ bgcolor: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.16)', borderRadius: 3, height: '100%' }}>
                      <CardActionArea component={Link} to={`/social/post/${post.id}`} sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>
                            {post.title || 'Untitled post'}
                          </Typography>
                          {post.content && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'rgba(255,255,255,0.66)',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {post.content}
                            </Typography>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* AI news around the web — deterministic digest, aggregator
              pattern: headline + snippet + attribution, link out to the
              original. Refreshed by `npm run news:pull` + rebuild. */}
          {aiNewsDigest.items && aiNewsDigest.items.length > 0 && (
            <Box sx={{ mb: 6 }}>
              <Typography component="h2" variant="h5" sx={{ mb: 0.5, fontWeight: 600 }}>
                AI news around the web
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 2 }}>
                Curated from {[...new Set(aiNewsDigest.items.map((i) => i.source))].length} sources. Headlines link straight to the original publishers.
              </Typography>
              <Stack spacing={1.5}>
                {aiNewsDigest.items.slice(0, 12).map((item) => (
                  <Box
                    key={item.url}
                    component="a"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'block',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      textDecoration: 'none',
                      '&:hover': { bgcolor: 'rgba(108,99,255,0.10)', borderColor: 'rgba(108,99,255,0.30)' },
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>
                      {item.source}
                      {item.publishedAt && (
                        <Box component="span" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>
                          {' '}· {formatNewsDate(item.publishedAt)}
                        </Box>
                      )}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, my: 0.25 }}>
                      {item.title} ↗
                    </Typography>
                    {item.summary && (
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        {item.summary}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Community CTA — News is the public front door to the social pages */}
          <Box sx={{ mt: 4, p: 4, borderRadius: 3, bgcolor: 'rgba(108,99,255,0.10)', border: '1px solid #6C63FF', textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              The conversation happens on Nunba
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              Every update here started as a community thread. Join a community, post a thought
              experiment, or just lurk.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
              <Button
                component={Link}
                to="/social/communities"
                variant="contained"
                sx={{ bgcolor: '#6C63FF', '&:hover': { bgcolor: '#5A52E0' }, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                Browse communities
              </Button>
              <Button
                component={Link}
                to="/download"
                variant="outlined"
                sx={{ borderColor: '#10b981', color: '#10b981', borderRadius: 2, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#059669', bgcolor: 'rgba(16,185,129,0.06)' } }}
              >
                Get Nunba free
              </Button>
            </Stack>
          </Box>
      </PublicSeoPage>
    </>
  );
}

export default NewsIndex;
