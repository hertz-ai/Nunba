/* eslint-disable */
import React from 'react';
// import { graphql, useStaticQuery } from 'gatsby';
import Box from '@mui/material/Box';

import Content from './content';

const styles = {
  row: {
    display: 'grid',
    gridGap: '50px 100px',
    '@media (min-width:900px)': {
      gridTemplateColumns: '1fr 1fr',
    },
  },
  col: {
    flex: '1 1 320px',
    minWidth: '50%',
  },
  heading: {
    color: '#28315E',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 0,
    marginBottom: '64px',
    '@media (min-width:900px)': {
      fontSize: 32,
      textAlign: 'center',
    },
  },
  question: {
    marginTop: 0,
    fontSize: 16,
    color: '#546fff',
    fontWeight: 'bold',
    wordBreak: 'break-word',
    '@media (min-width:900px)': {
      fontSize: 20,
    },
  },
  answer: {
    margin: 0,
    fontSize: 14,
    wordBreak: 'break-word',
    '@media (min-width:900px)': {
      fontSize: 16,
    },
  },
};

function Faq({faq}) {
  const data = '';
  // const data = useStaticQuery(graphql`
  //   query {
  //     markdownRemark(frontmatter: { page: { eq: "faq" } }) {
  //       frontmatter {
  //         faq {
  //           question
  //           answer
  //         }
  //       }
  //     }
  //   }
  // `);

  const _faq = data.markdownRemark.frontmatter.faq;

  faq = faq || _faq;

  if (!faq) return null;
  if (faq.length === 0) return null;

  return (
    <div>
      <Box component="h1" sx={styles.heading}>
        Frequently Asked Questions
      </Box>
      <Box sx={styles.row}>
        {faq.map((item, index) => (
          <Box key={index} sx={styles.col}>
            <Box component="p" sx={styles.question}>
              {item.question}
            </Box>
            <Box sx={styles.answer}>
              <Content md={item.answer} />
            </Box>
          </Box>
        ))}
        <Box sx={styles.col} />
      </Box>
    </div>
  );
}

export default Faq;
