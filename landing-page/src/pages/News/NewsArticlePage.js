/* eslint-disable */
import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import PublicSeoPage from '../../components/shared/PublicSeoPage';
import { NEWS_ITEMS, getNewsItem, formatNewsDate } from './newsData';
import PageMeta from '../../components/shared/PageMeta';

function NewsArticlePage() {
  const { slug } = useParams();
  const item = getNewsItem(slug);

  // Unknown slug → back to the index (no soft-404 content to index).
  if (!item) return <Navigate to="/news" replace />;

  const url = `https://hevolve.ai/news/${item.slug}`;
  const others = NEWS_ITEMS.filter((n) => n.slug !== item.slug).slice(0, 3);

  return (
    <>
      <PageMeta
        title={`${item.title} | Nunba News, Hevolve AI`}
        description={item.description}
        ogTitle={item.title}
        path={url}
        type="article"
      >
<meta property="article:published_time" content={item.date} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: item.title,
          description: item.description,
          datePublished: item.date,
          url,
          author: { '@type': 'Organization', name: 'Hevolve AI' },
          publisher: { '@type': 'Organization', name: 'Hevolve AI', url: 'https://hevolve.ai' },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'News', item: 'https://hevolve.ai/news' },
            { '@type': 'ListItem', position: 2, name: item.title, item: url },
          ],
        })}</script>
      </PageMeta>
      <PublicSeoPage
        heading={item.title}
        headingVariant="h3"
        maxWidth="md"
        topSlot={
          <>
            <Button
              component={Link}
              to="/news"
              size="small"
              sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'none', mb: 3, '&:hover': { color: '#fff' } }}
            >
              ← All news
            </Button>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Chip
                label={item.category}
                size="small"
                sx={{ bgcolor: 'rgba(108,99,255,0.14)', color: '#9B94FF', fontWeight: 700 }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                {formatNewsDate(item.date)}
              </Typography>
            </Stack>
          </>
        }
      >
          <Stack spacing={2.5} sx={{ mb: 5, mt: 2 }}>
            {item.body.map((paragraph, i) => (
              <Typography key={i} variant="body1" sx={{ color: 'rgba(255,255,255,0.86)', lineHeight: 1.8 }}>
                {paragraph}
              </Typography>
            ))}
          </Stack>

          {/* Deep link into the Nunba surface this news came from */}
          <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(108,99,255,0.10)', border: '1px solid #6C63FF', mb: 6 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
            >
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                This update lives on Nunba. Join the community to be part of the next one.
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button
                  component={Link}
                  to={item.community.to}
                  variant="contained"
                  sx={{ bgcolor: '#6C63FF', '&:hover': { bgcolor: '#5A52E0' }, borderRadius: 2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {item.community.label}
                </Button>
                <Button
                  component={Link}
                  to="/social/communities"
                  variant="outlined"
                  sx={{ borderColor: '#6C63FF', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', '&:hover': { borderColor: '#FF6B6B', bgcolor: 'rgba(108,99,255,0.08)' } }}
                >
                  Communities
                </Button>
              </Stack>
            </Stack>
          </Box>

          {others.length > 0 && (
            <>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)', mb: 4 }} />
              <Typography component="h2" variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                More news
              </Typography>
              <Stack spacing={1.5}>
                {others.map((n) => (
                  <Box
                    key={n.slug}
                    component={Link}
                    to={`/news/${n.slug}`}
                    sx={{
                      display: 'block',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(108,99,255,0.05)',
                      border: '1px solid rgba(108,99,255,0.14)',
                      textDecoration: 'none',
                      '&:hover': { bgcolor: 'rgba(108,99,255,0.12)' },
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#FF6B6B', fontWeight: 600 }}>
                      {formatNewsDate(n.date)} · {n.category}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                      {n.title}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </>
          )}
      </PublicSeoPage>
    </>
  );
}

export default NewsArticlePage;
