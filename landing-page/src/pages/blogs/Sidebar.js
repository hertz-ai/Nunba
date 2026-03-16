/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

const sxStyles = {
  sidebarAboutBox: {
    padding: '16px',
    backgroundColor: 'grey.200',
  },
  sidebarSection: {
    marginTop: '24px',
  },
  avatar: {
    margin: '8px',
  },
};

export default function Sidebar(props) {
  const {archives, description, social, title} = props;
  // const { archives, description,  title } = props;

  return (
    <Grid item xs={12} md={4}>
      <Paper elevation={0} sx={sxStyles.sidebarAboutBox}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography>{description}</Typography>
      </Paper>
      <Typography variant="h6" gutterBottom sx={sxStyles.sidebarSection}>
        Archives
      </Typography>
      {archives.map((archive) => (
        <Link
          display="block"
          variant="body1"
          href={archive.url}
          key={archive.title}
        >
          {archive.title}
        </Link>
      ))}
      <Typography variant="h6" gutterBottom sx={sxStyles.sidebarSection}>
        Social
      </Typography>
      {social.map((network) => (
        <Link display="block" variant="body1" href={network.link} key={network}>
          <Grid container direction="row" spacing={1} alignItems="center">
            <Grid item>
              {/* <network.icon /> */}
              <FontAwesomeIcon
                icon={network.icon}
                size="lg"
                style={sxStyles.avatar}
              ></FontAwesomeIcon>
            </Grid>
            <Grid item>{network.name}</Grid>
          </Grid>
        </Link>
      ))}
    </Grid>
  );
}

Sidebar.propTypes = {
  archives: PropTypes.array,
  description: PropTypes.string,
  // social: PropTypes.array,
  title: PropTypes.string,
};
