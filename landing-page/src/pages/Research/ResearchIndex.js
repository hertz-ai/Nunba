/* eslint-disable */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import PublicSeoPage from '../../components/shared/PublicSeoPage';
import registry from '../../data/researchPapers.json';
import { TOPIC_LABELS, formatPaperDate, paperAuthorsLine } from './researchShared';
import { SITE } from '../../config/site';
import PageMeta from '../../components/shared/PageMeta';


// Only papers with a written explanation are published as pages; the rest
// sit in the registry as the explanation agent's queue and never surface.
const PUBLISHED = registry.papers.filter((p) => p.explanation);

function ResearchIndex() {
  const [topic, setTopic] = useState('all');
  const papers = PUBLISHED.filter((p) => topic === 'all' || p.topic === topic);

  return (
    <>
      <PageMeta
        title="AI &amp; BCI Research Explained: Recent Papers in Plain Language | Hevolve AI"
        description="Recent AI and brain-computer interface papers, each one read and rewritten in plain language so you can tell fast whether it matters to you. Every page links to the original."
        ogTitle="AI & BCI Research Explained"
        ogDescription="Latest AI and BCI papers from Nature and arXiv, with plain-language explanations."
        path={`${SITE}/research`}
      >
        <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'AI & BCI Research Explained', url: `${SITE}/research`, publisher: { '@type': 'Organization', name: 'Hevolve AI', url: SITE }, mainEntity: { '@type': 'ItemList', numberOfItems: PUBLISHED.length, itemListElement: PUBLISHED.slice(0, 25).map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'ScholarlyArticle', headline: p.title, datePublished: p.publishedAt, url: `${SITE}/research/${p.slug}`, sameAs: p.url, ...(p.authors.length ? { author: p.authors.map((a) => ({ '@type': 'Person', name: a })) } : {}), }, })), }, })}</script>
      </PageMeta>
      <PublicSeoPage
        heading="Research, explained"
        subheading={`Recent AI and brain-computer interface papers, each one read and rewritten in plain language so you can tell in thirty seconds whether it matters to you. ${PUBLISHED.length} explained so far, with more added as they are written.`}
      >
        {/* Wraps. Three filter chips in a non-wrapping row measured 440px of
            content in a 360px viewport, so /research scrolled sideways on a
            phone -- the third chip simply ran off the screen. The chip row
            further down this same file already wrapped; this one was the
            outlier. useFlexGap is required for spacing to survive wrapping:
            Stack's default margin-based spacing breaks across wrapped lines. */}
        <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mb: 4 }}>
          {[['all', 'All papers'], ...Object.entries(TOPIC_LABELS)].map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              clickable
              onClick={() => setTopic(key)}
              sx={{
                fontWeight: 700,
                bgcolor: topic === key ? '#6C63FF' : 'rgba(108,99,255,0.10)',
                color: '#fff',
                border: '1px solid rgba(108,99,255,0.30)',
                '&:hover': { bgcolor: topic === key ? '#5A52E0' : 'rgba(108,99,255,0.22)' },
              }}
            />
          ))}
        </Stack>
        <Grid container spacing={2.5}>
          {papers.map((p) => (
            <Grid item xs={12} md={6} key={p.slug}>
              <Card sx={{ bgcolor: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.18)', borderRadius: 3, height: '100%' }}>
                <CardActionArea component={Link} to={`/research/${p.slug}`} sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        label={TOPIC_LABELS[p.topic] || p.topic}
                        size="small"
                        sx={{ bgcolor: p.topic === 'bci' ? 'rgba(255,107,107,0.16)' : 'rgba(16,185,129,0.14)', color: p.topic === 'bci' ? '#FF6B6B' : '#10b981', fontWeight: 700 }}
                      />
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                        {p.journal} · {formatPaperDate(p.publishedAt)}
                      </Typography>
                      {p.explanation && (
                        <Chip label="Explained" size="small" sx={{ bgcolor: 'rgba(255,171,0,0.16)', color: '#FFAB00', fontWeight: 700 }} />
                      )}
                    </Stack>
                    <Typography component="h2" variant="subtitle1" sx={{ color: '#fff', fontWeight: 600, lineHeight: 1.35, mb: 0.5 }}>
                      {p.title}
                    </Typography>
                    {p.authors.length > 0 && (
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5 }}>
                        {paperAuthorsLine(p.authors)}
                      </Typography>
                    )}
                    {p.abstract && (
                      <Typography
                        variant="body2"
                        sx={{ color: 'rgba(255,255,255,0.66)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {p.abstract}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </PublicSeoPage>
    </>
  );
}

export default ResearchIndex;
