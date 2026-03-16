/* eslint-disable */
import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import EventIcon from '@mui/icons-material/Event';
import {graphql} from 'gatsby';
import 'lazysizes';

import Cards from '../components/cards';
import Contact from '../components/contact';
import Customers from '../components/customers';
import Demo from '../components/demo';
import Faq from '../components/faq';
import Features from '../components/features-2';
import Layout from '../components/layout';
import SEO from '../components/seo';
import Spacer from '../components/spacer';

const styles = {
  row: {
    display: 'grid',
    alignItems: 'center',
    gridGap: '50px 100px',
    '@media (min-width:900px)': {
      gridTemplateColumns: '1fr 1fr',
    },
  },
  column1: {
    order: 2,
    '@media (min-width:900px)': {
      order: 1,
    },
  },
  column2: {
    order: 1,
    '@media (min-width:900px)': {
      order: 2,
    },
  },
  media: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: 360,
    objectFit: 'contain',
    outline: 0,
  },
  heading: {
    color: '#28315E',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 0,
    '@media (min-width:900px)': {
      fontSize: 32,
      textAlign: 'center',
    },
  },
  heading2: {
    color: '#757A96',
    fontSize: 14,
    fontWeight: 'normal',
    '@media (min-width:900px)': {
      fontSize: 16,
      textAlign: 'center',
    },
  },
  line1: {
    fontSize: 18,
    display: 'block',
    marginBottom: '6px',
  },
  line2: {
    fontSize: 22,
    fontWeight: 600,
    whiteSpace: 'pre-wrap',
  },
  box1: {
    background: 'linear-gradient(354.37deg, #2F43AF 11.74%, #546FFF 88.26%)',
    boxShadow: '0px 4px 22px rgba(0, 0, 0, 0.16)',
    color: '#fff',
  },
  box2: {
    '@media (max-width:599px)': {
      display: 'grid',
    },
  },
  background1: {
    backgroundImage:
      'linear-gradient(to bottom, #fff 40%, #EDEEF4 40%, #EDEEF4 80%, #fff 80%)',
  },
  demo: {
    '@media (min-width:900px)': {
      textAlign: 'center',
    },
  },
  box4: {
    padding: '50px 0px',
    textAlign: 'center',
    display: 'grid',
    justifyItems: 'center',
    gridGap: '50px 100px',
    '@media (min-width:1200px)': {
      gridAutoFlow: 'column',
      textAlign: 'left',
    },
  },
  heroHeading: {
    textAlign: 'left',
    fontSize: 28,
    lineHeight: '1.2',
    marginBottom: '20px',
    '@media (min-width:1200px)': {
      fontSize: 44,
    },
  },
  heroHeading2: {
    textAlign: 'left',
    fontSize: 16,
    margin: 0,
    '@media (min-width:1200px)': {
      fontSize: 24,
    },
  },
};

const Product = ({data}) => {
  const pageData = data.markdownRemark.frontmatter.data;

  return (
    <Layout>
      <SEO title={pageData.seo_title} description={pageData.seo_description} />

      <Spacer h={100} />

      <Container>
        <div style={{overflow: 'hidden'}}>
          <div>
            <Box sx={styles.row}>
              <Box sx={styles.column1}>
                <div>
                  <Box
                    component="p"
                    sx={{...styles.heading, ...styles.heroHeading}}
                  >
                    {pageData.hero.heading}
                  </Box>
                  <Box
                    component="p"
                    sx={{
                      ...styles.heading2,
                      ...styles.heroHeading2,
                      color: '#757A96',
                    }}
                  >
                    {pageData.hero.heading2}
                  </Box>
                  <div style={{margin: '30px -8px 0'}}>
                    <a
                      href={pageData.hero.cta_1.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{margin: 8}}
                    >
                      {pageData.hero.cta_1.text}
                    </a>
                    <a
                      href={pageData.hero.cta_2.link}
                      className="btn blue"
                      style={{margin: 8}}
                    >
                      {pageData.hero.cta_2.text}
                    </a>
                  </div>

                  <p
                    style={{fontSize: 12, color: '#99A3B4', margin: '10px 0 0'}}
                  >
                    {pageData.hero.cta_caption}
                  </p>
                </div>
              </Box>

              <Box sx={styles.column2}>
                {/([/|.|\w|\s|-])*\.(?:jpeg|jpg|gif|png|webp|svg)/gi.test(
                  pageData.hero.image
                ) ? (
                  <Box
                    component="img"
                    className="lazyload"
                    sx={styles.media}
                    // imgix does not transformation for gif and webp files
                    data-src={
                      pageData.hero.image +
                      (/([/|.|\w|\s|-])*\.(?:gif|webp)/gi.test(
                        pageData.hero.image
                      )
                        ? ''
                        : '?w=800')
                    }
                    alt=""
                  />
                ) : (
                  <Box
                    component="video"
                    className="lazyload"
                    sx={styles.media}
                    data-src={`${pageData.hero.image}?w=800`}
                    autoPlay
                    muted
                    loop
                  />
                )}
              </Box>
            </Box>
          </div>
        </div>
      </Container>

      <Spacer h={120} />

      <section style={{background: '#EDEEF4'}}>
        <Container>
          <div style={{padding: '60px 0'}}>
            <Features features={pageData.features.cards} iconHeight={60} />
          </div>
        </Container>
      </section>

      <Container>
        <div id="demo" style={{height: 100}} />

        <Box sx={styles.demo}>
          <Box component="h1" sx={styles.heading}>
            {pageData.try_product.heading}
          </Box>
          <Box
            component="h2"
            sx={{
              ...styles.heading2,
              display: 'inline-block',
              maxWidth: 700,
              margin: 0,
            }}
          >
            {pageData.try_product.heading2}
          </Box>
        </Box>

        <Spacer h={60} />

        <Demo
          demo={pageData.demo}
          getStartedLink={pageData.getStartedLink}
          upload
          uploadUrl="https://customer.nanonets.com/invoice-digitization/predict"
        />
      </Container>

      <Spacer h={120} />

      <Box sx={styles.box1}>
        <Container>
          <Box sx={styles.box4}>
            <div>
              <img
                src="/media/invoice-capture-ai.png"
                alt=""
                style={{
                  width: '100%',
                  maxWidth: 400,
                  maxHeight: 200,
                  objectFit: 'contain',
                }}
              />
            </div>
            <div style={{maxWidth: 500}}>
              <Box
                component="h1"
                sx={{
                  ...styles.heading,
                  textAlign: 'inherit',
                  color: '#fff',
                  fontWeight: 'bold',
                  margin: 0,
                }}
              >
                {pageData.cta_fold.heading}
              </Box>
              <div style={{margin: '30px -8px 0'}}>
                <a
                  href={pageData.cta_fold.cta_1.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    margin: 8,
                    color: '#fff',
                    border: '1px solid #fff',
                  }}
                >
                  {pageData.cta_fold.cta_1.text}
                </a>
                <a
                  href={pageData.cta_fold.cta_2.link}
                  className="btn"
                  style={{
                    margin: 8,
                    color: '#546fff',
                    background: '#fff',
                    border: 0,
                  }}
                >
                  {pageData.cta_fold.cta_2.text}
                </a>
              </div>
            </div>
          </Box>
        </Container>
      </Box>

      <Spacer h={100} />

      <Container>
        <Box sx={styles.row}>
          <Box sx={styles.column1}>
            <Box
              component="img"
              className="lazyload"
              sx={styles.media}
              data-src={`${pageData.fold_3.image}?w=800`}
              alt=""
            />
          </Box>
          <Box sx={{...styles.column2, maxWidth: 600}}>
            <Box component="p" sx={{...styles.heading, textAlign: 'left'}}>
              {pageData.fold_3.heading}
            </Box>
            <Box component="p" sx={{...styles.heading2, textAlign: 'left'}}>
              {pageData.fold_3.heading2}
            </Box>
            <div style={{marginTop: 30}}>
              <a
                className="btn blue"
                href={pageData.schedule_call_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Schedule Demo</span>
                <EventIcon style={{marginLeft: 10}} />
              </a>
            </div>
          </Box>
        </Box>
      </Container>

      <Spacer h={100} />

      <section id="case-studies">
        <Container>
          <div>
            <Box component="h1" sx={styles.heading}>
              Case Studies
            </Box>
            <Box component="h2" sx={{...styles.heading2, margin: 0}}>
              {pageData.case_studies.heading}
            </Box>
          </div>
          <div style={{height: '3rem'}} />
          <Cards cards={pageData.case_studies.slides} />
        </Container>
      </section>

      {/* {
        pageData.use_cases.visible
        && (
          <section>
            <Spacer h={100} />

            <Container>
              <div>
                <Box component="h1" sx={styles.heading}>Applicable across industries</Box>
              </div>
              <div style={{ height: '3rem' }} />
              <Cards cards={pageData.use_cases.slides} cardType={2} />
            </Container>
          </section>
        )
      } */}

      <Spacer h={100} />

      <Container>
        <Faq faq={pageData.faq} />
      </Container>

      <Spacer h={140} />

      <Container>
        <Customers />
      </Container>

      <Spacer h={80} />

      <div id="contact">
        <Spacer h={60} />
        <Contact />
      </div>

      <Spacer h={60} />
    </Layout>
  );
};

export default Product;

export const query = graphql`
  query ($path: String!) {
    markdownRemark(frontmatter: {path: {eq: $path}}) {
      frontmatter {
        data {
          seo_title
          seo_description
          schedule_call_link
          getStartedLink
          hero {
            heading
            heading2
            cta_caption
            image
            cta_1 {
              text
              link
            }
            cta_2 {
              text
              link
            }
          }
          features {
            cards {
              title
              summary
              icon
            }
          }
          fold_3 {
            image
            heading
            heading2
          }
          try_product {
            heading
            heading2
            cta_caption
          }
          demo {
            input
            output {
              result
            }
            demo_type
            output_type
          }
          cta_fold {
            heading
            cta_1 {
              text
              link
            }
            cta_2 {
              text
              link
            }
          }
          use_cases {
            slides {
              title
              summary
              poster
              href
            }
          }
          case_studies {
            heading
            slides {
              title
              summary
              poster
              href
            }
          }
          faq {
            answer
            question
          }
        }
      }
    }
  }
`;
