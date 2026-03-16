import React from 'react';
import {Link} from 'react-router-dom';
import './TeacherHome.css';
function Footer() {
  return (
    <div className="footer-section">
      <h3 style={{color: 'white'}}>Copyright © </h3>
      <Link style={{color: 'white'}} href="https://hertzai.com/">
        HertzAI
      </Link>
      <span style={{color: 'white', margin: '0px 4px'}}>
        {' '}
        {new Date().getFullYear()}
      </span>
    </div>
  );
}

export default Footer;
