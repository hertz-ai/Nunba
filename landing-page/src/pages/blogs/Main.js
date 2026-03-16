/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Markdown from './Markdown';
//color button styles - starts
import {purple} from '@mui/material/colors';
import Button from '@mui/material/Button';
//color button styles - ends

const sxStyles = {
  markdown: {
    fontSize: '0.875rem',
    lineHeight: 1.43,
    letterSpacing: '0.01071em',
    padding: '24px 0',
  },
};

function routeToContactUs() {
  //document.querySelector("#mySidenav > li:nth-child(8) > a").click();
  document
    .querySelector(
      '#root > div > header > div.navbar-wrapper.undefined > div > div > div.navbar-nav-wrapper > ul > li:nth-child(11) > a'
    )
    .click();
}

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.palette.getContrastText(purple[500]),
    // color: "linear-gradient(to right, #00e89d, #0078ff)",
    background: 'linear-gradient(to right, #00e89d, #0078ff)',
    // backgroundColor: purple[500],
    '&:hover': {
      backgroundColor: purple[700],
    },
  },
}))(Button);

export default function Main(props) {
  const {posts, title} = props;

  return (
    <Grid item xs={12} md={8}>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      <Divider />
      {/* Visualize the post content */}
      {/* <pre>Blog content :: {JSON.stringify(posts, null, 2)}</pre> */}
      {posts.map((post) => (
        <>
          <Markdown style={sxStyles.markdown} key={post.substring(0, 40)}>
            {post}
          </Markdown>
          {/* <Markdown>{post}</Markdown>; */}
        </>
      ))}
      {/* <Markdown># Hello world!</Markdown>; */}
      <ColorButton
        variant="contained"
        color="primary"
        onClick={routeToContactUs}
        style={{display: props.discoverMore}}
      >
        Discover More
      </ColorButton>
    </Grid>
  );
}

Main.propTypes = {
  posts: PropTypes.array,
  title: PropTypes.string,
};
