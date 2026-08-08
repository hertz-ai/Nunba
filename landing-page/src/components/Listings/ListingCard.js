/* eslint-disable */
import React from 'react';
import { Link } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Rating from '@mui/material/Rating';

// Generic listing card — renders whatever fields the listing has and hides
// the rest, so one card serves every vertical (marketplace/rentals/housing).
export default function ListingCard({ listing, detailPath }) {
  const price =
    listing.price_spark != null
      ? `${listing.price_spark} ✦`
      : listing.price != null
      ? listing.price
      : null;

  return (
    <Card
      sx={{
        bgcolor: 'rgba(108,99,255,0.06)',
        border: '1px solid rgba(108,99,255,0.18)',
        borderRadius: 3,
        height: '100%',
      }}
    >
      <CardActionArea component={Link} to={detailPath} sx={{ height: '100%' }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
            {listing.category && (
              <Chip
                label={listing.category}
                size="small"
                sx={{ bgcolor: 'rgba(16,185,129,0.14)', color: '#10b981', fontWeight: 700 }}
              />
            )}
            {price && (
              <Typography variant="subtitle2" sx={{ color: '#FFAB00', fontWeight: 700 }}>
                {price}
              </Typography>
            )}
          </Stack>
          <Typography component="h3" variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>
            {listing.title || 'Untitled listing'}
          </Typography>
          {listing.description && (
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                mb: 1,
              }}
            >
              {listing.description}
            </Typography>
          )}
          {listing.rating_avg != null && listing.review_count > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Rating value={Number(listing.rating_avg)} precision={0.5} size="small" readOnly />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                ({listing.review_count})
              </Typography>
            </Stack>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
