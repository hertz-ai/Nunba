/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import PublicSeoPage from '../shared/PublicSeoPage';
import { VERTICALS, VERTICAL_KEYS } from './verticals';
import ListingCard from './ListingCard';
import { SITE } from '../../config/site';
import PageMeta from '../shared/PageMeta';


// Hub tile for one vertical on /listings
function VerticalTile({ vkey, v }) {
  const isExternal = typeof v.external === 'string' && v.external.startsWith('http');
  const to = v.external || `/listings/${vkey}`;
  const inner = (
    <CardContent>
      <Typography variant="h2" component="div" sx={{ fontSize: '2.2rem', mb: 1 }}>
        {v.emoji}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Typography component="h2" variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
          {v.label}
        </Typography>
        {v.comingSoon && (
          <Chip label="Coming soon" size="small" sx={{ bgcolor: 'rgba(255,171,0,0.14)', color: '#FFAB00', fontWeight: 700 }} />
        )}
      </Stack>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.68)' }}>
        {v.tagline}
      </Typography>
    </CardContent>
  );
  return (
    <Card sx={{ bgcolor: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.18)', borderRadius: 3, height: '100%', opacity: v.comingSoon ? 0.75 : 1 }}>
      {v.comingSoon ? (
        <Box sx={{ p: 0 }}>{inner}</Box>
      ) : isExternal ? (
        <CardActionArea component="a" href={to} target="_blank" rel="noopener noreferrer" sx={{ height: '100%' }}>
          {inner}
        </CardActionArea>
      ) : (
        <CardActionArea component={Link} to={to} sx={{ height: '100%' }}>
          {inner}
        </CardActionArea>
      )}
    </Card>
  );
}

export default function ListingsPage() {
  const { vertical } = useParams();
  const v = vertical ? VERTICALS[vertical] : null;
  const [items, setItems] = useState(null); // null = loading, [] = empty

  useEffect(() => {
    setItems(null);
    if (v && v.fetcher) {
      v.fetcher()
        .then((list) => setItems(Array.isArray(list) ? list : []))
        .catch(() => setItems([]));
    }
  }, [vertical]);

  // Unknown vertical, or one that lives elsewhere (news → /news)
  if (vertical && !v) return <Navigate to="/listings" replace />;
  if (v && v.external && !v.external.startsWith('http')) return <Navigate to={v.external} replace />;

  const canonical = vertical ? `${SITE}/listings/${vertical}` : `${SITE}/listings`;
  const title = v
    ? `${v.label}: Listings | Hevolve AI`
    : 'Listings: Marketplace, Rentals, Housing, Rides, and More | Hevolve AI';
  const description = v
    ? v.tagline
    : 'Community-run listings across verticals: agent marketplace, rentals, housing, news, groceries, and rides, all kept current by HARTOS agents on the Hevolve platform.';

  return (
    <>
      <PageMeta
        title={`${title}`}
        description={description}
        ogTitle={title}
        path={canonical}
      >
{v && Array.isArray(items) && items.length > 0 && (
          <script type="application/ld+json">{JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${v.label} listings`,
            url: canonical,
            numberOfItems: items.length,
            itemListElement: items.slice(0, 20).map((l, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': v.schemaType,
                name: l.title,
                description: l.description,
                ...(l.rating_avg != null && l.review_count > 0
                  ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: l.rating_avg, reviewCount: l.review_count } }
                  : {}),
              },
            })),
          })}</script>
        )}
      </PageMeta>
      <PublicSeoPage
        heading={v ? v.label : 'Listings'}
        subheading={
          v
            ? v.tagline
            : 'One platform, many verticals, kept current by HARTOS agents and owned by the community.'
        }
      >
          {!v && (
            <Grid container spacing={3}>
              {VERTICAL_KEYS.map((k) => (
                <Grid item xs={12} sm={6} md={4} key={k}>
                  <VerticalTile vkey={k} v={VERTICALS[k]} />
                </Grid>
              ))}
            </Grid>
          )}

          {v && items === null && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#6C63FF' }} />
            </Box>
          )}

          {v && Array.isArray(items) && items.length > 0 && (
            <Grid container spacing={3}>
              {items.map((l) => (
                <Grid item xs={12} sm={6} md={4} key={l.id || l.listing_id || l.title}>
                  <ListingCard listing={l} detailPath={v.detailPath ? v.detailPath(l) : '/social/marketplace'} />
                </Grid>
              ))}
            </Grid>
          )}

          {v && Array.isArray(items) && items.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8, px: 3, borderRadius: 3, bgcolor: 'rgba(108,99,255,0.06)', border: '1px dashed rgba(108,99,255,0.35)' }}>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                Nothing listed yet
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.7, mb: 3, maxWidth: 520, mx: 'auto' }}>
                {v.emptyText || 'Be the first to publish a listing in this vertical.'}
              </Typography>
              {v.ctaTo && (
                <Button
                  component={Link}
                  to={v.ctaTo}
                  variant="contained"
                  sx={{ bgcolor: '#6C63FF', '&:hover': { bgcolor: '#5A52E0' }, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  {v.ctaLabel || 'Create a listing'}
                </Button>
              )}
            </Box>
          )}

          {v && (
            <Box sx={{ mt: 6 }}>
              <Button component={Link} to="/listings" size="small" sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'none', '&:hover': { color: '#fff' } }}>
                ← All verticals
              </Button>
            </Box>
          )}
      </PublicSeoPage>
    </>
  );
}
