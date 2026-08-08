/* eslint-disable */
import React from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import PublicSeoPage from '../../components/shared/PublicSeoPage';
import answers from '../../data/answers.json';
import { SITE } from '../../config/site';
import PageMeta from '../../components/shared/PageMeta';


function AnswerIndex() {
  const list = answers.answers || [];
  return (
    <>
      <PageMeta
        title="Answers to Questions About AI and Brain-Computer Interfaces | Hevolve AI"
        description="Straight answers to questions about AI agents and brain-computer interfaces, each grounded in current research we have read and explained."
        ogTitle="Answers About AI and Brain-Computer Interfaces"
        ogDescription="Questions answered from current research, with the papers cited."
        path={`${SITE}/answers`}
      >
        <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Answers', url: `${SITE}/answers`, hasPart: list.map((a) => ({ '@type': 'Question', name: a.question, url: `${SITE}/answers/${a.slug}`, })), })}</script>
      </PageMeta>

      <PublicSeoPage
        heading="Answers"
        headingVariant="h4"
        maxWidth="md"
        subheading="Questions people actually ask, answered from research we have read rather than opinion. Every answer cites the papers behind it."
      >
        <Stack spacing={2}>
          {list.map((a) => (
            <Box key={a.slug} component={Link} to={`/answers/${a.slug}`}
                 sx={{ display: 'block', p: 3, borderRadius: 2, textDecoration: 'none',
                       bgcolor: 'rgba(255,255,255,0.03)',
                       border: '1px solid rgba(255,255,255,0.10)',
                       '&:hover': { borderColor: '#10b981', bgcolor: 'rgba(255,255,255,0.06)' } }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                {a.question}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>
                {a.shortAnswer}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', mt: 1.5, display: 'block' }}>
                {(a.citedPapers || []).length} papers cited
              </Typography>
            </Box>
          ))}
        </Stack>
      </PublicSeoPage>
    </>
  );
}

export default AnswerIndex;
