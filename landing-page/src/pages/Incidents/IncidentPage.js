/* eslint-disable */
import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import PublicSeoPage from '../../components/shared/PublicSeoPage';
import incidents from '../../data/incidents.json';
import { SITE } from '../../config/site';
import PageMeta from '../../components/shared/PageMeta';


// Postmortems of real failures in this codebase, written for the people and
// agents most likely to repeat them. The value here is entirely in the
// specifics being true: a sanitised incident teaches nothing, because the
// thing worth learning is usually the reason the wrong explanation was
// convincing at the time.
function IncidentPage() {
  const { slug } = useParams();
  const list = incidents.incidents || [];
  const item = list.find((i) => i.slug === slug) || null;
  if (!item) return <Navigate to="/incidents" replace />;

  const url = `${SITE}/incidents/${item.slug}`;
  const others = list.filter((i) => i.slug !== item.slug).slice(0, 3);

  return (
    <>
      <PageMeta
        title={`${item.title} | Hevolve AI`}
        description={item.summary.slice(0, 155)}
        ogTitle={item.title}
        path={url}
        type="article"
      >
<script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: item.title,
          abstract: item.summary,
          datePublished: item.date,
          dateModified: item.date,
          keywords: (item.tags || []).join(', '),
          author: {
            '@type': item.author?.type || 'Organization',
            name: item.author?.name,
            ...(item.author?.url ? { url: item.author.url } : {}),
          },
          publisher: { '@type': 'Organization', name: 'Hevolve AI', url: SITE },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          articleSection: 'Engineering postmortem',
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Incidents', item: `${SITE}/incidents` },
            { '@type': 'ListItem', position: 2, name: item.title, item: url },
          ],
        })}</script>
      </PageMeta>

      <PublicSeoPage heading={item.title} headingVariant="h4" maxWidth="md">
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3, mt: -1 }}>
          By {item.author?.name} · {item.date}
        </Typography>

        {/* The gap between the two readings IS the lesson, so it leads. */}
        <Box sx={{ mb: 4, borderRadius: 2, overflow: 'hidden',
                   border: '1px solid rgba(255,255,255,0.12)' }}>
          <Box sx={{ p: 2.5, bgcolor: 'rgba(239,68,68,0.08)' }}>
            <Typography variant="overline" sx={{ color: '#f87171', letterSpacing: 1 }}>
              What it looked like
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
              {item.lookedLike}
            </Typography>
          </Box>
          <Box sx={{ p: 2.5, bgcolor: 'rgba(16,185,129,0.08)' }}>
            <Typography variant="overline" sx={{ color: '#10b981', letterSpacing: 1 }}>
              What it was
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
              {item.actuallyWas}
            </Typography>
          </Box>
        </Box>

        {(item.sections || []).map((s, i) => (
          <Box key={i} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 1.5 }}>
              {s.heading}
            </Typography>
            {s.body.split('\n\n').map((para, j) => {
              // Paragraphs that are code keep their line breaks and get a mono
              // face; prose does not. Detected rather than marked up, so an
              // incident entry stays plain JSON.
              const isCode = /^[a-z_$][\w$]*\s*=|^(try|return|if|valid|pkill|urlPath)\b|^\s{2,}/.test(s.body) &&
                             /[{}();=]/.test(para) && para.length < 400;
              return isCode ? (
                <Box key={j} component="pre" sx={{
                  bgcolor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 1.5, p: 2, mb: 2, overflowX: 'auto',
                  fontSize: '0.86rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.88)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}>{para}</Box>
              ) : (
                <Typography key={j} variant="body1"
                            sx={{ color: 'rgba(255,255,255,0.86)', lineHeight: 1.85,
                                  mb: 2, fontSize: '1.03rem' }}>
                  {para}
                </Typography>
              );
            })}
          </Box>
        ))}

        <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(139,92,246,0.10)',
                   border: '1px solid rgba(139,92,246,0.30)', mb: 4 }}>
          <Typography variant="overline" sx={{ color: '#a78bfa', letterSpacing: 1 }}>
            The general lesson
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.92)',
                                            lineHeight: 1.8, fontSize: '1.06rem', mt: 0.5 }}>
            {item.lesson}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 4 }}>
          {(item.tags || []).map((t) => (
            <Chip key={t} label={t} size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }} />
          ))}
        </Stack>

        {others.length > 0 && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 4 }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
              Other things that went wrong
            </Typography>
            <Stack spacing={1.25}>
              {others.map((o) => (
                <Box key={o.slug} component={Link} to={`/incidents/${o.slug}`}
                     sx={{ display: 'block', p: 2, borderRadius: 2, textDecoration: 'none',
                           bgcolor: 'rgba(255,255,255,0.03)',
                           border: '1px solid rgba(255,255,255,0.10)',
                           '&:hover': { borderColor: '#10b981' } }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>
                    {o.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    {o.summary.slice(0, 110)}…
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}

        <Box sx={{ mt: 5 }}>
          <Chip component={Link} to="/incidents" clickable label="← All incidents"
                sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' }} />
        </Box>
      </PublicSeoPage>
    </>
  );
}

export default IncidentPage;
