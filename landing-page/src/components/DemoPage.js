/* eslint-disable */
import React from 'react';
import HevolveDemo from './hevolveDemo';
import Spacer from './Spacer';
import Typography from '@mui/material/Typography';

import Footer from '../pages/Layouts/footer-light';

import Header from '../pages/Layouts/header';
const DemoPage = () => {
  return (
    <>
      <Header />

      <div className="demo_Container" style={{marginTop: '100px'}}>
        <Typography
          variant="h3"
          paragraph={true}
          style={{
            fontSize: '2.5rem',
            fontWeight: 'lighter',
            textAlign: 'center',
          }}
        >
          Check the demo live!
        </Typography>
        <Spacer h={60} />
        <HevolveDemo />
      </div>
      <Footer />
    </>
  );
};

export default DemoPage;
