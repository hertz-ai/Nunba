/* eslint-disable */
// Renders a page published through the backend pages API at /blog/<slug>.
//
// This is the other half of "publishing is not a redeploy": the three
// legacy posts are static imports with their own routes, and everything
// published after them is a SitePage row fetched at runtime. A slug that
// matches nothing published sends the visitor to /blog rather than a 404,
// because the likeliest cause is an unpublish.
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import HeaderNano from '../Layouts/header';
import Main from './Main';
import Sidebar from './Sidebar';
import Spacer from '../../components/Agent/Spacer';
import FooterLight from '../../pages/Layouts/footer-light';
import { SOCIAL_API_URL } from '../../config/apiBase';

import {
  faLinkedin,
  faTwitter,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import PageMeta from '../../components/shared/PageMeta';

const sidebar = {
  title: 'About',
  description:
    'Hevolve builds Nunba, a local-first multimodal AI agent that runs on your machine. Voice + vision + chat + channels you already use. Free, no subscription, open source.',
  archives: [],
  social: [
    {
      name: 'Youtube',
      icon: faYoutube,
      link: 'https://www.youtube.com/channel/UClzFvo8SECdyd0dVQhJ2Cbg',
    },
    {
      name: 'Linkedin',
      icon: faLinkedin,
      link: 'https://www.linkedin.com/company/hertz-ai/',
    },
    {
      name: 'Twitter',
      icon: faTwitter,
      link: 'https://twitter.com/hertzai',
    },
  ],
};

export default function DynamicPage() {
  const { slug } = useParams();
  const [page, setPage] = React.useState(null);
  const [state, setState] = React.useState('loading'); // loading|ready|missing

  React.useEffect(() => {
    let alive = true;
    setState('loading');
    fetch(`${SOCIAL_API_URL}/pages/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!alive) return;
        if (body && body.success && body.page) {
          setPage(body.page);
          setState('ready');
        } else {
          setState('missing');
        }
      })
      .catch(() => alive && setState('missing'));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state === 'missing') {
    return <Navigate to="/blog" replace />;
  }

  return (
    <React.Fragment>
      {page && (
        <PageMeta
          title={`${page.title} | Hevolve`}
          description={page.description || page.title}
          ogTitle={page.title}
          path={`https://hevolve.ai/blog/${page.slug}`}
          type="article"
        >
<script type="application/ld+json">{JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: page.title,
            description: page.description || page.title,
            url: `https://hevolve.ai/blog/${page.slug}`,
            datePublished: page.published_at,
            author: { '@type': 'Organization', name: 'Hevolve AI' },
            publisher: { '@type': 'Organization', name: 'Hevolve AI', url: 'https://hevolve.ai' },
            mainEntityOfPage: { '@type': 'WebPage', '@id': `https://hevolve.ai/blog/${page.slug}` },
          })}</script>
        </PageMeta>
      )}
      <HeaderNano />
      <Container maxWidth="lg">
        <main>
          {state === 'loading' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={5} sx={{ marginTop: '24px' }}>
              <Main
                title={page.title}
                posts={[page.content || '']}
                discoverMore="block"
              />
              <Sidebar
                title={sidebar.title}
                description={sidebar.description}
                archives={sidebar.archives}
                social={sidebar.social}
              />
            </Grid>
          )}
        </main>
      </Container>
      <Spacer h={120} />
      <FooterLight />
    </React.Fragment>
  );
}
