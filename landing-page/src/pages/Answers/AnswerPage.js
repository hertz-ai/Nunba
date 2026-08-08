/* eslint-disable */
import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import PublicSeoPage from '../../components/shared/PublicSeoPage';
import answers from '../../data/answers.json';
import papers from '../../data/researchPapers.json';
import { SITE } from '../../config/site';
import PageMeta from '../../components/shared/PageMeta';


// These pages exist because the research pages cannot rank on their own: a
// paper title is nobody's search query. A question is. The corpus becomes the
// evidence a question page cites, which is also what gives 200 paper pages a
// crawl path from content people actually look for.
function AnswerPage() {
  const { slug } = useParams();
  const answer = (answers.answers || []).find((a) => a.slug === slug) || null;
  if (!answer) return <Navigate to="/answers" replace />;

  const url = `${SITE}/answers/${answer.slug}`;
  const bySlug = new Map((papers.papers || []).map((p) => [p.slug, p]));
  // Only cite papers that are actually published — a citation to a page that
  // redirects is worse than no citation.
  const cited = (answer.citedPapers || [])
    .map((s) => bySlug.get(s))
    .filter((p) => p && p.explanation);

  return (
    <>
      <PageMeta
        title={`${answer.question} | Hevolve AI`}
        description={answer.shortAnswer.slice(0, 155)}
        ogTitle={answer.question}
        path={url}
        type="article"
      >
{/* QAPage + Question/Answer is the schema Google uses for this shape of
            content; it is what makes a question page eligible for the answer
            treatment rather than being read as a generic article. */}
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'QAPage',
          ...(answer.image ? {
            image: {
              '@type': 'ImageObject',
              url: `${SITE}${answer.image}`,
              caption: answer.imageAlt,
            },
          } : {}),
          mainEntity: {
            '@type': 'Question',
            name: answer.question,
            text: answer.question,
            answerCount: 1,
            dateModified: answer.updatedAt,
            acceptedAnswer: {
              '@type': 'Answer',
              text: answer.shortAnswer,
              url,
              // Named accountability, not an implied byline. `author` carries
              // whoever actually stands behind the page; it is the organisation
              // unless a real named person has reviewed it. We do not invent a
              // person to make an answer look more human-written than it is.
              ...(answer.author ? {
                author: {
                  '@type': answer.author.type || 'Organization',
                  name: answer.author.name,
                  ...(answer.author.url ? { url: answer.author.url } : {}),
                },
              } : {}),
              // Citations are declared so the grounding is machine-readable,
              // not just a list of links in the body.
              citation: cited.map((p) => ({
                '@type': 'ScholarlyArticle',
                name: p.title,
                url: `${SITE}/research/${p.slug}`,
                ...(p.doi ? { identifier: p.doi } : {}),
              })),
            },
          },
          publisher: { '@type': 'Organization', name: 'Hevolve AI', url: SITE },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Answers', item: `${SITE}/answers` },
            { '@type': 'ListItem', position: 2, name: answer.question, item: url },
          ],
        })}</script>
      </PageMeta>

      <PublicSeoPage heading={answer.question} headingVariant="h4" maxWidth="md">
        {(answer.author || answer.updatedAt) && (
          <Typography variant="body2"
                      sx={{ color: 'rgba(255,255,255,0.5)', mb: 3, mt: -1 }}>
            {answer.author && <>By {answer.author.name}</>}
            {answer.author && answer.updatedAt && ' · '}
            {answer.updatedAt && <>Updated {answer.updatedAt}</>}
          </Typography>
        )}

        {/* The direct answer leads. Somebody arriving from a search wants it
            resolved before they decide whether to keep reading. */}
        <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.08)',
                   border: '1px solid rgba(16,185,129,0.25)', mb: 4 }}>
          <Typography variant="overline" sx={{ color: '#10b981', letterSpacing: 1 }}>
            Short answer
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.92)',
                                            lineHeight: 1.8, fontSize: '1.08rem', mt: 0.5 }}>
            {answer.shortAnswer}
          </Typography>
        </Box>

        {/* A diagram earns its place only where it carries information the prose
            cannot: what crosses a network boundary, what calls what. Decorative
            imagery would just be page weight. */}
        {answer.image && (
          <Box component="figure" sx={{ m: 0, mb: 4 }}>
            <Box component="img" src={answer.image} alt={answer.imageAlt || answer.question}
                 loading="lazy" width="880" height="430"
                 sx={{ width: '100%', height: 'auto', display: 'block', borderRadius: 2,
                       bgcolor: 'rgba(255,255,255,0.02)',
                       border: '1px solid rgba(255,255,255,0.10)' }} />
            {answer.imageAlt && (
              <Typography component="figcaption" variant="caption"
                          sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 1.25 }}>
                {answer.imageAlt}
              </Typography>
            )}
          </Box>
        )}

        {(answer.sections || []).map((s, i) => (
          <Box key={i} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 1.5 }}>
              {s.heading}
            </Typography>
            {s.body.split('\n\n').map((para, j) => (
              <Typography key={j} variant="body1"
                          sx={{ color: 'rgba(255,255,255,0.86)', lineHeight: 1.85,
                                mb: 2, fontSize: '1.03rem' }}>
                {para}
              </Typography>
            ))}
          </Box>
        ))}

        {cited.length > 0 && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 4 }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
              The research this is based on
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', mb: 2.5 }}>
              {cited.length} papers, each explained in plain language.
            </Typography>
            <Stack spacing={1.25}>
              {cited.map((p) => (
                <Box key={p.slug} component={Link} to={`/research/${p.slug}`}
                     sx={{ display: 'block', p: 2, borderRadius: 2, textDecoration: 'none',
                           bgcolor: 'rgba(255,255,255,0.03)',
                           border: '1px solid rgba(255,255,255,0.10)',
                           '&:hover': { borderColor: '#10b981',
                                        bgcolor: 'rgba(255,255,255,0.06)' } }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>
                    {p.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    {p.journal}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}

        <Box sx={{ mt: 5 }}>
          <Chip component={Link} to="/answers" clickable label="← All answers"
                sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' }} />
        </Box>
      </PublicSeoPage>
    </>
  );
}

export default AnswerPage;
