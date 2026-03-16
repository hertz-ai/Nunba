/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';

const sxStyles = {
  mainFeaturedPost: {
    position: 'relative',
    backgroundColor: 'grey.800',
    color: 'common.white',
    marginBottom: '32px',
    backgroundImage: 'url(https://source.unsplash.com/random)',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,.3)',
  },
  mainFeaturedPostContent: {
    position: 'relative',
    padding: '24px',
    '@media (min-width:900px)': {
      padding: '48px',
      paddingRight: 0,
    },
  },
};

export default function MainFeaturedPost(props) {
  const {post} = props;

  return (
    <Paper
      sx={{...sxStyles.mainFeaturedPost, backgroundImage: `url(${post.image})`}}
    >
      {/* Increase the priority of the hero background image */}
      {<img style={{display: 'none'}} src={post.image} alt={post.imageText} />}
      <div style={sxStyles.overlay} />
      <Grid container>
        <Grid item md={6}>
          <Box sx={sxStyles.mainFeaturedPostContent}>
            <Typography
              component="h1"
              variant="h3"
              color="inherit"
              gutterBottom
            >
              {post.title}
            </Typography>
            <Typography variant="h5" color="inherit" paragraph>
              {post.description}
            </Typography>
            {/* <Link variant="subtitle1" href="#">
              {post.linkText}
            </Link> */}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}

MainFeaturedPost.propTypes = {
  post: PropTypes.object,
};
