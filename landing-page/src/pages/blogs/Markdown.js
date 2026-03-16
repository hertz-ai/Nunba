/* eslint-disable */
import React from 'react';
import ReactMarkdown from 'markdown-to-jsx';
import {withStyles} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import {logger} from '../../utils/logger';

const styles = (theme) => ({
  listItem: {
    marginTop: theme.spacing(1),
  },
});

const options = {
  overrides: {
    div: {
      component: Typography,
    },
    h1: {
      component: Typography,
      props: {
        gutterBottom: true,
        variant: 'h5',
      },
    },
    h2: {component: Typography, props: {gutterBottom: true, variant: 'h6'}},
    h3: {
      component: Typography,
      props: {gutterBottom: true, variant: 'subtitle1'},
    },
    h4: {
      component: Typography,
      props: {gutterBottom: true, variant: 'caption', paragraph: true},
    },
    p: {component: Typography, props: {paragraph: true}},
    a: {component: Link},
    li: {
      component: withStyles(styles)(({classes, ...props}) => (
        <li className={classes.listItem}>
          <Typography component="span" {...props} />
        </li>
      )),
    },
  },
};

export default function Markdown(props) {
  return (
    <>
      <ReactMarkdown options={options} {...props} />
      {/* <pre>Markdown :: {JSON.stringify(props, null, 2)}</pre> */}
    </>
    // logger.log("props -> " + props);
    // render(<Markdown># Hello world!</Markdown>, document.body);
  );
}
