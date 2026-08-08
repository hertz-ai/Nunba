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
import DiscussBar from '../../components/shared/DiscussBar';
import registry from '../../data/researchPapers.json';
import { TOPIC_LABELS, formatPaperDate, paperAuthorsLine } from './researchShared';
import { SITE } from '../../config/site';
import PageMeta from '../../components/shared/PageMeta';


// Content policy: everything on this page is real papermetadata + the
// publisher's abstract (attributed, truncated, linked out). The
// plain-language explanation section renders ONLY when a human or the
// HARTOS paper-explanation agent has written one for this paper —
// otherwise it shows an honest pending note. No fabricated insight.
function ResearchPaperPage() {
  const { slug } = useParams();
  const paper = registry.papers.find((p) => p.slug === slug) || null;
  // A paper is a page only once it has an explanation. Unknown slugs and
  // still-queued (un-explained) papers both fall back to the index — we
  // never show a "coming soon" placeholder.
  if (!paper || !paper.explanation) return <Navigate to="/research" replace />;

  // Abstracts run long; show a readable lead-in and link out for the rest.
  const abstractLead =
    paper.abstract && paper.abstract.length > 480
      ? paper.abstract.slice(0, 480).replace(/\s+\S*$/, '') + '…'
      : paper.abstract;

  const url = `${SITE}/research/${paper.slug}`;

  // Related papers are a rotating window, not the first four.
  //
  // `.slice(0, 4)` on a date-sorted list meant every paper in a topic pointed
  // at the same four newest papers. Those four collected an inbound link from
  // every sibling and the remaining ~128 pages received none at all, leaving
  // them reachable only from the index: orphans in the internal link graph,
  // which is where crawl depth and link equity come from. Offsetting the
  // window by each paper's own position spreads inbound links evenly across
  // the corpus, and stays deterministic so prerendered HTML is stable between
  // builds (a hash or random pick would churn every page on every build).
  const pool = registry.papers.filter(
    (p) => p.explanation && p.topic === paper.topic && p.slug !== paper.slug,
  );
  const self = registry.papers.filter((p) => p.topic === paper.topic)
    .findIndex((p) => p.slug === paper.slug);
  const related = pool.length <= 4
    ? pool
    : Array.from({ length: 4 }, (_, k) => pool[((self * 4) + k) % pool.length]);

  // One description, reused by the meta tag and the share cards -- they should
  // never drift apart.
  const metaDescription = paper.explanation
    ? paper.explanation.replace(/\s+/g, ' ').slice(0, 155)
    : `What this ${TOPIC_LABELS[paper.topic]} paper (${paper.journal}) is about, in plain language.`;

  return (
    <>
      <PageMeta
        title={`${paper.title}: Explained in Plain Language | Hevolve Research`}
        description={metaDescription}
        ogTitle={paper.title}
        path={url}
        type="article"
      >
{/* Without these the share card fell back to the site-wide blurb, so a
            shared paper link advertised the homepage instead of the paper. */}
        <meta property="article:published_time" content={paper.publishedAt} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ScholarlyArticle',
          headline: paper.title,
          datePublished: paper.publishedAt,
          url,
          sameAs: paper.url,
          ...(paper.doi ? { identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: paper.doi } } : {}),
          isPartOf: { '@type': 'Periodical', name: paper.journal },
          ...(paper.authors.length ? { author: paper.authors.map((a) => ({ '@type': 'Person', name: a })) } : {}),
          publisher: { '@type': 'Organization', name: 'Hevolve AI', url: SITE },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Research', item: `${SITE}/research` },
            { '@type': 'ListItem', position: 2, name: paper.title, item: url },
          ],
        })}</script>
      </PageMeta>
      <PublicSeoPage
        heading={paper.title}
        headingVariant="h4"
        maxWidth="md"
        topSlot={
          <>
            <Button
              component={Link}
              to="/research"
              size="small"
              sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'none', mb: 3, '&:hover': { color: '#fff' } }}
            >
              ← All research
            </Button>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={TOPIC_LABELS[paper.topic] || paper.topic}
                size="small"
                sx={{ bgcolor: paper.topic === 'bci' ? 'rgba(255,107,107,0.16)' : 'rgba(16,185,129,0.14)', color: paper.topic === 'bci' ? '#FF6B6B' : '#10b981', fontWeight: 700 }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                {paper.journal} · {formatPaperDate(paper.publishedAt)}
              </Typography>
            </Stack>
          </>
        }
      >
        {paper.authors.length > 0 && (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3, mt: 1 }}>
            {paperAuthorsLine(paper.authors)}
          </Typography>
        )}

        {/* Plain-language explanation leads — it's the reason to be here. */}
        <Box sx={{ mb: 4 }}>
          {paper.explanation.split('\n\n').map((para, i) => (
            <Typography key={i} variant="body1" sx={{ color: 'rgba(255,255,255,0.88)', lineHeight: 1.85, mb: 2.5, fontSize: '1.05rem' }}>
              {para}
            </Typography>
          ))}
        </Box>

        {abstractLead && (
          <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', mb: 4 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.5)', letterSpacing: 1, display: 'block', mb: 0.5 }}>
              From the {paper.journal} abstract
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, fontStyle: 'italic' }}>
              {abstractLead}
            </Typography>
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 5 }}>
          <Button
            component="a"
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            sx={{ bgcolor: '#6C63FF', '&:hover': { bgcolor: '#5A52E0' }, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Read the paper at the source ↗
          </Button>
          {paper.doi && (
            <Button
              component="a"
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              sx={{ borderColor: '#6C63FF', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#FF6B6B' } }}
            >
              DOI: {paper.doi}
            </Button>
          )}
        </Stack>

        {/* A reader who finishes an explanation currently has nowhere to go but
            back. These are the three things they actually want next, and each
            runs on machinery that already exists: the agent chat, community
            posts, and ShareDialog. The seed is written here rather than
            generated because a good opening question is specific to the thing
            just read — for a paper that is what would falsify it, which is the
            question the explanation itself cannot answer. */}
        <DiscussBar
          sx={{ mb: 5 }}
          title={paper.title}
          url={url}   /* the same const the canonical + og:url use */
          seed={`I just read the plain-language explanation of "${paper.title}". `
            + `What would have to be true for its central claim to be wrong, and `
            + `what would falsify it? Where does it overreach?`}
        />

        {related.length > 0 && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)', mb: 3 }} />
            <Typography component="h2" variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              More {TOPIC_LABELS[paper.topic]} papers
            </Typography>
            <Stack spacing={1.5}>
              {related.map((p) => (
                <Box
                  key={p.slug}
                  component={Link}
                  to={`/research/${p.slug}`}
                  sx={{ display: 'block', p: 2, borderRadius: 2, bgcolor: 'rgba(108,99,255,0.05)', border: '1px solid rgba(108,99,255,0.14)', textDecoration: 'none', '&:hover': { bgcolor: 'rgba(108,99,255,0.12)' } }}
                >
                  <Typography variant="caption" sx={{ color: '#FF6B6B', fontWeight: 600 }}>
                    {p.journal} · {formatPaperDate(p.publishedAt)}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                    {p.title}
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

export default ResearchPaperPage;
