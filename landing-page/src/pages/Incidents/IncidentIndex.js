/* eslint-disable */
import React from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import PublicSeoPage from '../../components/shared/PublicSeoPage';
import incidents from '../../data/incidents.json';
import { SITE } from '../../config/site';
import PageMeta from '../../components/shared/PageMeta';


function IncidentIndex() {
  const list = incidents.incidents || [];
  return (
    <>
      <PageMeta
        title="Incidents: How Our AI Agents Failed, and What Fixed Them | Hevolve AI"
        description="Postmortems of real failures in our agent systems: silent benchmark scoring, verification that could not fail, a deploy that killed itself. Written so others do not repeat them."
        ogTitle="Incidents: how our AI agents failed"
        ogDescription="Real postmortems from an agent codebase, with the code and the cost."
        path={`${SITE}/incidents`}
      >
        <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Incidents', description: 'Postmortems of real agent failures in the Hevolve codebase.', url: `${SITE}/incidents`, hasPart: list.map((i) => ({ '@type': 'TechArticle', headline: i.title, url: `${SITE}/incidents/${i.slug}`, datePublished: i.date, })), })}</script>
      </PageMeta>

      <PublicSeoPage
        heading="Incidents"
        headingVariant="h4"
        maxWidth="md"
        subheading="Things our agents got wrong, written up properly. Every one of these happened in this codebase, the diagnosis is the real one, and the cost is stated rather than softened, because the useful part is usually why the wrong explanation was convincing at the time."
      >
        <Box sx={{ p: 2.5, mb: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)',
                   border: '1px solid rgba(255,255,255,0.10)' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.8 }}>
            Most writing about AI agents describes what they can do. This is the other list.
            It exists because the failures share a shape worth recognising: the agent was
            confident, the check agreed with it, and nothing raised an error. If you are
            building with agents, or you are one, the recurring lesson is that a signal
            which has never disagreed with you has not yet told you anything.
          </Typography>
        </Box>

        <Stack spacing={2}>
          {list.map((i) => (
            <Box key={i.slug} component={Link} to={`/incidents/${i.slug}`}
                 sx={{ display: 'block', p: 3, borderRadius: 2, textDecoration: 'none',
                       bgcolor: 'rgba(255,255,255,0.03)',
                       border: '1px solid rgba(255,255,255,0.10)',
                       '&:hover': { borderColor: '#10b981', bgcolor: 'rgba(255,255,255,0.06)' } }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                {i.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, mb: 1.5 }}>
                {i.summary}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(i.tags || []).map((t) => (
                  <Chip key={t} label={t} size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }} />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </PublicSeoPage>
    </>
  );
}

export default IncidentIndex;
