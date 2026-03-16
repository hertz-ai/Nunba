/* eslint-disable */
import React, {Component} from 'react';
import DOMPurify from 'dompurify';
import './css/bootstrap.css';
// import './css/style.css'
//import './css/dark.css'
// import './css/font-icons.css'
// import './css/animate.css'
// import './css/magnific-popup.css'
//import './css/responsive.css'
//import './css/settings.css'
// import './css/layers.css'
//import './css/navigation.css'

var createReactClass = require('create-react-class');

var HertzAI = createReactClass({
  render: function () {
    return (
      <div>
        <meta httpEquiv="content-type" content="text/html; charset=utf-8" />
        <meta name="author" content="SemiColonWeb" />
        {/* Stylesheets
      ============================================= */}
        <link
          href="https://fonts.googleapis.com/css?family=Lato:300,400,400i,700|Raleway:300,400,500,600,700|Crete+Round:400i"
          rel="stylesheet"
          type="text/css"
        />
        <link rel="stylesheet" href="css/bootstrap.css" type="text/css" />
        <link rel="stylesheet" href="style.css" type="text/css" />
        <link rel="stylesheet" href="css/dark.css" type="text/css" />
        <link rel="stylesheet" href="css/font-icons.css" type="text/css" />
        <link rel="stylesheet" href="css/animate.css" type="text/css" />
        <link rel="stylesheet" href="css/magnific-popup.css" type="text/css" />
        <link rel="stylesheet" href="css/responsive.css" type="text/css" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/*[if lt IE 9]>
          
      <![endif]*/}
        {/* SLIDER REVOLUTION 5.x CSS SETTINGS */}
        <link
          rel="stylesheet"
          type="text/css"
          href="include/rs-plugin/css/settings.css"
          media="screen"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="include/rs-plugin/css/layers.css"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="include/rs-plugin/css/navigation.css"
        />
        {/* Document Title
      ============================================= */}
        <title>HertzAI</title>
        <style
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(
              "\n\n\t\t.revo-slider-emphasis-text {\n\t\t\tfont-size: 64px;\n\t\t\tfont-weight: 700;\n\t\t\tletter-spacing: -1px;\n\t\t\tfont-family: 'Raleway', sans-serif;\n\t\t\tpadding: 15px 20px;\n\t\t\tborder-top: 2px solid #FFF;\n\t\t\tborder-bottom: 2px solid #FFF;\n\t\t}\n\n\t\t.revo-slider-desc-text {\n\t\t\tfont-size: 20px;\n\t\t\tfont-family: 'Lato', sans-serif;\n\t\t\twidth: 650px;\n\t\t\ttext-align: center;\n\t\t\tline-height: 1.5;\n\t\t}\n\n\t\t.revo-slider-caps-text {\n\t\t\tfont-size: 16px;\n\t\t\tfont-weight: 400;\n\t\t\tletter-spacing: 3px;\n\t\t\tfont-family: 'Raleway', sans-serif;\n\t\t}\n\n\t\t.tp-video-play-button { display: none !important; }\n\n\t\t.tp-caption { white-space: nowrap; }\n\n\t"
            ),
          }}
        />
        {/* Document Wrapper
      ============================================= */}
        <div id="wrapper" className="clearfix">
          {/* Header
          ============================================= */}
          <header
            id="header"
            className="transparent-header full-header"
            data-sticky-className="not-dark"
          >
            <div id="header-wrap">
              <div className="container clearfix">
                <div id="primary-menu-trigger">
                  <i className="icon-reorder" />
                </div>
                {/* Logo
                      ============================================= */}
                <div id="logo">
                  <a
                    href="index.html"
                    className="standard-logo"
                    data-dark-logo="images/logo-dark.png"
                  >
                    <img src="images/logo.png" alt="HertzAI Logo" />
                  </a>
                  <a
                    href="index.html"
                    className="retina-logo"
                    data-dark-logo="images/logo-dark@2x.png"
                  >
                    <img src="images/logo@2x.png" alt="HertzAI Logo" />
                  </a>
                </div>
                {/* #logo end */}
                {/* Primary Navigation
                      ============================================= */}
                <nav id="primary-menu">
                  <ul>
                    <li className="current">
                      {/* <a href="index.html"><div>Hertz AI</div></a> */}
                      <a href="http://etime.hertzai.com/">
                        <div>Hertz AI</div>
                      </a>
                      <ul>
                        <li>
                          <a href="auto-checkout.html">
                            <div>Auto Checkout</div>
                          </a>
                        </li>
                        <li>
                          <a href="index-magazine-2.html">
                            <div>Real Time Inventory Monitoring</div>
                          </a>
                        </li>
                        <li>
                          <a href="index-magazine-3.html">
                            <div>Education</div>
                          </a>
                        </li>
                        <li>
                          <a href="index-magazine-3.html">
                            <div>Product Discovery</div>
                          </a>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <a href="#">
                        <div>CortX</div>
                      </a>
                      <ul>
                        <li>
                          <a href="#">
                            <div>
                              <i className="icon-stack" />
                              Learn
                            </div>
                          </a>
                          <ul>
                            <li>
                              <a href="Ed Techhtml">
                                <div>Teach Me</div>
                              </a>
                            </li>
                          </ul>
                        </li>
                        <li>
                          <a href="index-magazine-2.html">
                            <div>Assess Me</div>
                          </a>
                        </li>
                      </ul>
                    </li>
                    <li className="mega-menu">
                      <a href="#">
                        <div>How Our AI Evolves?</div>
                      </a>
                    </li>
                    <li className="mega-menu">
                      <a href="https://www.mcgroce.com/hertzDrive-v1.0/">
                        <div>Demo</div>
                      </a>
                    </li>
                    <li className="mega-menu">
                      <a href="http://etime.hertzai.com/contactus">
                        <div>Contact Us</div>
                      </a>
                    </li>
                  </ul>
                  {/* Top Search
                          ============================================= */}
                  <div id="top-search">
                    <a href="#" id="top-search-trigger">
                      <i className="icon-search3" />
                      <i className="icon-line-cross" />
                    </a>
                    <form action="search.html" method="get">
                      <input
                        type="text"
                        name="q"
                        className="form-control"
                        defaultValue
                        placeholder="Type & Hit Enter.."
                      />
                    </form>
                  </div>
                  {/* #top-search end */}
                </nav>
                {/* #primary-menu end */}
              </div>
            </div>
          </header>
          {/* #header end */}
          {/* Slider
          ============================================= */}
          <section
            id="slider"
            className="slider-element revslider-wrap slider-parallax clearfix"
          >
            <div className="slider-parallax-inner">
              <div
                id="rev_slider_579_1_wrapper"
                className="rev_slider_wrapper fullscreen-container"
                data-alias="default-slider"
                style={{padding: '0px'}}
              >
                {/* START REVOLUTION SLIDER 5.1.4 fullscreen mode */}
                <div
                  id="rev_slider_579_1"
                  className="rev_slider fullscreenbanner"
                  style={{display: 'none'}}
                  data-version="5.1.4"
                >
                  <ul>
                    {' '}
                    {/* SLIDE  */}
                    <li
                      className="dark"
                      data-transition="slideup"
                      data-slotamount={1}
                      data-masterspeed={1000}
                      data-fstransition="fade"
                      data-fsmasterspeed={1000}
                      data-fsslotamount={7}
                      data-saveperformance="off"
                      data-title="CORTX"
                    >
                      {/* MAIN IMAGE */}
                      <img
                        src="images/slider/rev/main/s2-bg.jpg"
                        alt="video_woman_cover3"
                        data-bgposition="center center"
                        data-bgfit="cover"
                        data-bgrepeat="no-repeat"
                      />
                      {/* LAYERS */}
                      {/* LAYER NR. 2 */}
                      <div
                        className="tp-caption ltl tp-resizeme rs-parallaxlevel-8"
                        data-x={200}
                        data-y={107}
                        data-transform_in="x:0;y:-250;z:0;rotationZ:0;scaleX:0.2;scaleY:0.2;skewX:0;skewY:0;s:700;e:Power4.easeOutQuad;"
                        data-speed={700}
                        data-start={2600}
                        data-easing="easeOutCubic"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 3, whiteSpace: 'nowrap'}}
                      >
                        <img
                          src="images/slider/rev/main/s2-1.png"
                          style={{width: '107.32px'}}
                          alt="Image"
                        />
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme rs-parallaxlevel-7"
                        data-x={200}
                        data-y={107}
                        data-transform_in="x:0;y:-250;z:0;rotationZ:0;scaleX:0.1;scaleY:0.1;skewX:0;skewY:0;s:700;e:Power4.easeOutQuad;"
                        data-speed={700}
                        data-start={2800}
                        data-easing="easeOutCubic"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 4}}
                      >
                        <img
                          src="images/slider/rev/main/s2-2.png"
                          style={{width: '107.32px'}}
                          alt="Image"
                        />
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme rs-parallaxlevel-6"
                        data-x={200}
                        data-y={107}
                        data-transform_in="x:0;y:-250;z:0;rotationZ:0;scaleX:0.5;scaleY:0.5;skewX:0;skewY:0;s:700;e:Power4.easeOutCubic;"
                        data-speed={700}
                        data-start={3000}
                        data-easing="easeOutCubic"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 5}}
                      >
                        <img
                          src="images/slider/rev/main/s2-3.png"
                          style={{width: '107.32px'}}
                          alt="Image"
                        />
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme rs-parallaxlevel-5"
                        data-x={200}
                        data-y={107}
                        data-transform_in="x:0;y:-250;z:0;rotationZ:0;scaleX:0.5;scaleY:0.5;skewX:0;skewY:0;s:700;e:Power4.easeOutCubic;"
                        data-speed={700}
                        data-start={3200}
                        data-easing="easeOutCubic"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 6}}
                      >
                        <img
                          src="images/slider/rev/main/s2-4.png"
                          style={{width: '107.32px'}}
                          alt="Image"
                        />
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme rs-parallaxlevel-4"
                        data-x={200}
                        data-y={107}
                        data-transform_in="x:0;y:-250;z:0;rotationZ:0;scaleX:0.5;scaleY:0.5;skewX:0;skewY:0;s:700;e:Power4.easeOutCubic;"
                        data-speed={700}
                        data-start={3400}
                        data-easing="easeOutCubic"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 7}}
                      >
                        <img
                          src="images/slider/rev/main/s2-5.png"
                          style={{width: '107.32px'}}
                          alt="Image"
                        />
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme rs-parallaxlevel-3"
                        data-x={200}
                        data-y={107}
                        data-transform_in="x:0;y:-250;z:0;rotationZ:0;scaleX:0.5;scaleY:0.5;skewX:0;skewY:0;s:700;e:Power4.easeOutCubic;"
                        data-speed={700}
                        data-start={3600}
                        data-easing="easeOutCubic"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 8}}
                      >
                        <img
                          src="images/slider/rev/main/s2-6.png"
                          style={{width: '107.32px'}}
                          alt="Image"
                        />
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme rs-parallaxlevel-2"
                        data-x={200}
                        data-y={107}
                        data-transform_in="x:0;y:-250;z:0;rotationZ:0;scaleX:0.5;scaleY:0.5;skewX:0;skewY:0;s:700;e:Power4.easeOutCubic;"
                        data-speed={700}
                        data-start={3800}
                        data-easing="easeOutCubic"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 9}}
                      >
                        <img
                          src="images/slider/rev/main/s2-7.png"
                          style={{width: '107.32px'}}
                          alt="Image"
                        />
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme rs-parallaxlevel-1"
                        data-x={200}
                        data-y={107}
                        data-scalex={100}
                        data-scaley={190}
                        data-transform_in="x:0;y:-250;z:0;rotationZ:0;scaleX:0.1;scaleY:0.1;skewX:0;skewY:0;s:700;e:Power4.easeOutCubic;"
                        data-speed={700}
                        data-start={4000}
                        data-easing="easeOutCubic"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 10}}
                      >
                        <img
                          src="images/slider/rev/main/s2-8.png"
                          alt="Image"
                          style={{width: '107.32px'}}
                        />
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme revo-slider-caps-text"
                        data-x={40}
                        data-y={120}
                        data-transform_in="x:0;y:150;z:0;rotationZ:0;scaleX:1;scaleY:1;skewX:0;skewY:0;s:800;opacity:0;transformPerspective:200;transformOrigin:50% 0%;"
                        data-speed={800}
                        data-start={1200}
                        data-easing="easeOutQuad"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 11, whiteSpace: 'nowrap'}}
                      >
                        Think of AI?
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme revo-slider-emphasis-text nopadding noborder uppercase"
                        data-x={37}
                        data-y={140}
                        data-transform_in="x:5;y:0;z:0;rotationZ:0;scaleX:1;scaleY:1;skewX:5;skewY:0;opacity:0;s:800;transformPerspective:200;transformOrigin:50% 0%;"
                        data-speed={800}
                        data-start={1400}
                        data-easing="easeOutQuad"
                        data-splitin="chars"
                        data-splitout="none"
                        data-elementdelay="0.1"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-width="['800','800','560','380']"
                        data-height="none"
                        data-endeasing="Power4.easeIn"
                        style={{
                          zIndex: 11,
                          fontSize: '56px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        One Suite - One Consensus
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme revo-slider-desc-text tleft"
                        data-x={40}
                        data-y={240}
                        data-transform_in="x:0;y:150;z:0;rotationZ:0;scaleX:1;scaleY:1;skewX:0;skewY:0;opacity:0;s:800;transformPerspective:200;transformOrigin:50% 0%;"
                        data-speed={800}
                        data-start={1600}
                        data-easing="easeOutQuad"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1000}
                        data-width="['550','550','550','380']"
                        data-height="none"
                        data-endeasing="Power4.easeIn"
                        style={{
                          zIndex: 11,
                          maxWidth: '550px',
                          whiteSpace: 'normal',
                        }}
                      >
                        Own Your AI &amp; Tailored to your needs, Secure
                        in-house deployment. Your AI is constantly learning and
                        always evolving..
                      </div>
                      <div
                        className="tp-caption ltl tp-resizeme"
                        data-x={40}
                        data-y={350}
                        data-transform_in="x:0;y:150;z:0;rotationZ:0;scaleX:1;scaleY:1;skewX:0;skewY:0;s:800;opacity:0;transformPerspective:200;transformOrigin:50% 0%;"
                        data-speed={800}
                        data-start={1800}
                        data-easing="easeOutQuad"
                        data-splitin="none"
                        data-splitout="none"
                        data-elementdelay="0.01"
                        data-endelementdelay="0.1"
                        data-endspeed={1300}
                        data-endeasing="Power4.easeIn"
                        style={{zIndex: 11}}
                      >
                        <a
                          href="#"
                          className="button button-border button-white button-light button-large button-rounded tright nomargin"
                        >
                          <span>Check Now</span>{' '}
                          <i className="icon-angle-right" />
                        </a>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              {/* END REVOLUTION SLIDER */}
            </div>
          </section>
          {/* Content
          ============================================= */}
          <section id="content">
            <div className="content-wrap">
              <div className="container clearfix">
                <div
                  className="divcenter center clearfix"
                  style={{maxWidth: '900px'}}
                >
                  <h1>
                    Welcome! to <span>HertzAI</span>.
                  </h1>
                  <h2>
                    One AI To Meet All Your Recognition Needs. Knowledge To
                    Intent/Action Platform With Privacy
                  </h2>
                  <a
                    href="#"
                    className="button button-3d button-dark button-large "
                  >
                    Know More
                  </a>
                  <a href="#" className="button button-3d button-large">
                    Contact Now
                  </a>
                </div>
                <div className="line" />
                <div className="col_one_third">
                  <div
                    className="feature-box fbox-small fbox-plain"
                    data-animate="fadeIn"
                  >
                    <div className="fbox-icon">
                      <a href="#">
                        <i className="icon-phone2" />
                      </a>
                    </div>
                    <h3>Performamce</h3>
                    <p>The Power Of AI To Save You Time.</p>
                  </div>
                </div>
                <div className="col_one_third">
                  <div
                    className="feature-box fbox-small fbox-plain"
                    data-animate="fadeIn"
                    data-delay={200}
                  >
                    <div className="fbox-icon">
                      <a href="#">
                        <i className="icon-eye" />
                      </a>
                    </div>
                    <h3>Precision</h3>
                    <p>Our Consensus Pipeline Does It All, See It In Action.</p>
                  </div>
                </div>
                <div className="clear" />
                <div className="col_one_third">
                  <div
                    className="feature-box fbox-small fbox-plain"
                    data-animate="fadeIn"
                    data-delay={600}
                  >
                    <div className="fbox-icon">
                      <a href="#">
                        <i className="icon-video" />
                      </a>
                    </div>
                    <h3>Own Your Data</h3>
                    <p>
                      HertzAI provides support for Native Deployment for
                      Financial Institutions, Taking Out the need to Send
                      Sensitive Data To Cloud.
                    </p>
                  </div>
                </div>
                <div className="col_one_third nobottommargin">
                  <div
                    className="feature-box fbox-small fbox-plain"
                    data-animate="fadeIn"
                    data-delay={1000}
                  >
                    <div className="fbox-icon">
                      <a href="#">
                        <i className="icon-fire" />
                      </a>
                    </div>
                    <h3>Endless Possibilities</h3>
                    <p>
                      Complete control on each &amp; every solution that
                      provides endless customization possibilities.
                    </p>
                  </div>
                </div>
                <div className="clear" />
                <div className="clear" />
              </div>
              <div
                className="divcenter center clearfix"
                style={{maxWidth: '1600px'}}
              ></div>
              <div className="clear" />
              <div
                className="section parallax dark nobottommargin nobottomborder"
                style={{
                  backgroundImage: 'url("images/logo-side.png")',
                  backgroundSize: '1700px',
                }}
                data-bottom-top="background-position:0px 0px;"
                data-top-bottom="background-position:0px -300px;"
              >
                <div className="container clearfix">
                  <div className="heading-block center">
                    <h2>HertzAI: Work with Our Patented Pipeline!</h2>
                    <span>
                      Built with Intelligence &amp; to empower your automation
                      flows. HertzAI modulates your bussiness with AI.
                    </span>
                  </div>
                  <div
                    style={{position: 'relative', marginBottom: '-60px'}}
                    data-height-xl={415}
                    data-height-lg={342}
                    data-height-md={262}
                    data-height-sm={160}
                    data-height-xs={102}
                  >
                    <img
                      src="https://cdn-images-1.medium.com/max/800/1*v71fbAzp09gzaUbEaZSLdg.png"
                      style={{position: 'absolute', top: 0, left: 0}}
                      data-animate="fadeInUp"
                      alt="Chrome"
                    />
                    <img
                      src="images/services/ipad3.png"
                      style={{
                        position: 'absolute',
                        right: '150px',
                        height: '500px',
                      }}
                      data-animate="fadeInUp"
                      data-delay={300}
                      alt="iPad"
                    />
                  </div>
                </div>
              </div>
              <div className="section notopmargin noborder nobottommargin">
                <div className="container clearfix">
                  <div className="heading-block center nobottommargin">
                    <h2>Products</h2>
                    <span>CortX, McGroce (Machine Merchadised Grocery)</span>
                  </div>
                </div>
              </div>
              <div className="container clearfix">
                <div className="col_two_third nobottommargin">
                  <div className="fancy-title title-border">
                    <h4>Recent Posts</h4>
                  </div>
                  <div className="col_half nobottommargin">
                    <div className="ipost clearfix">
                      <div className="entry-image">
                        <a href="https://link.medium.com/byRZCZ9FkW">
                          <img
                            className="image_fade"
                            src="https://cdn-images-1.medium.com/max/1600/1*bK6M3EAfX6ql_KDgD6obAg.png"
                            alt="Image"
                          />
                        </a>
                      </div>
                      <div className="entry-title">
                        <h3>
                          <a href="https://link.medium.com/byRZCZ9FkW">
                            Engineering A Deep Learning Project
                          </a>
                        </h3>
                      </div>
                      <ul className="entry-meta clearfix">
                        <li>
                          <i className="icon-calendar3" /> 10th Feb 2014
                        </li>
                        <li>
                          <a href="https://medium.com/hertz-ai/engineering-a-deep-learning-project-ccbf3b8cbf19">
                            <i className="icon-comments" /> 13
                          </a>
                        </li>
                      </ul>
                      <div className="entry-content">
                        <p>
                          Modelling real-world distribution is challenging but
                          progressively improving accuracy &amp; F1 score will
                          make the model to generalize to most scenarios.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col_half col_last nobottommargin">
                    <div className="ipost clearfix">
                      <div className="entry-image">
                        <a href="https://link.medium.com/r6jhn1fGkW">
                          <img
                            className="image_fade"
                            src="https://cdn-images-1.medium.com/max/1600/1*IUTJCYSIay0jPd7_hzfy3w.jpeg"
                            alt="Image"
                          />
                        </a>
                      </div>
                      <div className="entry-title">
                        <h3>
                          <a href="https://link.medium.com/r6jhn1fGkW">
                            Meta Learning — Learning To Learn
                          </a>
                        </h3>
                      </div>
                      <ul className="entry-meta clearfix">
                        <li>
                          <i className="icon-calendar3" /> 10th Feb 2014
                        </li>
                        <li>
                          <a href="https://medium.com/@mcgrocedata/meta-learning-learning-to-learn-5ccb5de6b7e6">
                            <i className="icon-comments" /> 13
                          </a>
                        </li>
                      </ul>
                      <div className="entry-content">
                        <p>
                          We, humans, are good at using our prior experience to
                          work on a previously unseen task.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="clear" />
                </div>
                <div className="col_one_third nobottommargin col_last">
                  <div className="fancy-title title-border">
                    <h4>Clients</h4>
                  </div>
                  <div
                    className="fslider testimonial nopadding noborder noshadow"
                    data-animation="slide"
                    data-arrows="false"
                  >
                    <div className="flexslider">
                      <div className="slider-wrap">
                        <div className="slide">
                          <div className="testi-image">
                            <a href="#">
                              <img
                                src="images/testimonials/3.jpg"
                                alt="Customer Testimonails"
                              />
                            </a>
                          </div>
                          <div className="testi-content">
                            <p>
                              Great and reliable to work with. Kudos to the
                              entire team.
                            </p>
                            <div className="testi-meta">
                              Divya Uday
                              <span>McGroce</span>
                            </div>
                          </div>
                        </div>
                        <div className="slide">
                          <div className="testi-image">
                            <a href="#">
                              <img
                                src="images/testimonials/2.jpg"
                                alt="Customer Testimonails"
                              />
                            </a>
                          </div>
                          <div className="testi-content">
                            <p>
                              A thorough architecture for my AI powered Game
                            </p>
                            <div className="testi-meta">
                              Jeevan
                              <span>Word With World</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="clear" />
                  <div className="well topmargin ohidden">
                    <h4>Opening Hours</h4>
                    <p />
                    <ul className="iconlist nobottommargin">
                      <li>
                        <i className="icon-time color" />{' '}
                        <strong>Mondays-Fridays:</strong> 10AM to 7PM
                      </li>
                      <li>
                        <i className="icon-time color" />{' '}
                        <strong>Saturdays:</strong> 11AM to 3PM
                      </li>
                      <li>
                        <i className="icon-time text-danger" />{' '}
                        <strong>Sundays:</strong> Closed
                      </li>
                    </ul>
                    <i className="icon-time bgicon" />
                  </div>
                </div>
                <div className="clear" />
              </div>
              <div className="section nobottommargin">
                <div className="container clearfix">
                  <div className="heading-block center">
                    <h3>
                      Subscribe to our <span>Newsletter</span>
                    </h3>
                  </div>
                  <div className="subscribe-widget">
                    <div className="widget-subscribe-form-result" />
                    <form
                      id="widget-subscribe-form2"
                      action="include/subscribe.php"
                      role="form"
                      method="post"
                      className="nobottommargin"
                    >
                      <div
                        className="input-group input-group-lg divcenter"
                        style={{maxWidth: '600px'}}
                      >
                        <div className="input-group-prepend">
                          <div className="input-group-text">
                            <i className="icon-email2" />
                          </div>
                        </div>
                        <input
                          type="email"
                          name="widget-subscribe-form-email"
                          className="form-control required email"
                          placeholder="Enter your Email"
                        />
                        <div className="input-group-append">
                          <button className="btn btn-secondary" type="submit">
                            Subscribe Now
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              {/* 
                  <div id="oc-clients" className="section nobgcolor notopmargin owl-carousel owl-carousel-full image-carousel footer-stick carousel-widget" data-margin="80" data-loop="true" data-nav="false" data-autoplay="5000" data-pagi="false" data-items-xs="2" data-items-sm="3" data-items-md="4" data-items-lg="5" data-items-xl="6">
  
                      <div className="oc-item"><a href="#"><img src="images/clients/1.png" alt="Clients"></a></div>
                      <div className="oc-item"><a href="#"><img src="images/clients/2.png" alt="Clients"></a></div>
                      <div className="oc-item"><a href="#"><img src="images/clients/3.png" alt="Clients"></a></div>
                      <div className="oc-item"><a href="#"><img src="images/clients/4.png" alt="Clients"></a></div>
                      <div className="oc-item"><a href="#"><img src="images/clients/5.png" alt="Clients"></a></div>
                      <div className="oc-item"><a href="#"><img src="images/clients/6.png" alt="Clients"></a></div>
                      <div className="oc-item"><a href="#"><img src="images/clients/7.png" alt="Clients"></a></div>
                      <div className="oc-item"><a href="#"><img src="images/clients/8.png" alt="Clients"></a></div>
                      <div className="oc-item"><a href="#"><img src="images/clients/9.png" alt="Clients"></a></div>
                      <div className="oc-item"><a href="#"><img src="images/clients/10.png" alt="Clients"></a></div>
  
                  </div> */}
            </div>
          </section>
          {/* #content end */}
          {/* Footer
          ============================================= */}
          <footer id="footer" className="dark">
            <div className="container">
              {/* Footer Widgets
                  ============================================= */}
              <div className="footer-widgets-wrap clearfix">
                <div className="col_one_third col_last">
                  <div
                    className="widget clearfix"
                    style={{marginBottom: '-20px'}}
                  >
                    <div className="row">
                      <div className="col-lg-6 bottommargin-sm">
                        <div className="counter counter-small">
                          <span
                            data-from={0}
                            data-to={2}
                            data-refresh-interval={50}
                            data-speed={2000}
                            data-comma="true"
                          />
                        </div>
                        <h5 className="nobottommargin">Clients</h5>
                      </div>
                    </div>
                  </div>
                  <div className="widget subscribe-widget clearfix">
                    <h5>
                      <strong>Subscribe</strong> to Our Newsletter to get
                      Important News, Amazing Offers &amp; Inside Scoops:
                    </h5>
                    <div className="widget-subscribe-form-result" />
                    <form
                      id="widget-subscribe-form"
                      action="include/subscribe.php"
                      role="form"
                      method="post"
                      className="nobottommargin"
                    >
                      <div className="input-group divcenter">
                        <div className="input-group-prepend">
                          <div className="input-group-text">
                            <i className="icon-email2" />
                          </div>
                        </div>
                        <input
                          type="email"
                          id="widget-subscribe-form-email"
                          name="widget-subscribe-form-email"
                          className="form-control required email"
                          placeholder="Enter your Email"
                        />
                        <div className="input-group-append">
                          <button className="btn btn-success" type="submit">
                            Subscribe
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                  <div
                    className="widget clearfix"
                    style={{marginBottom: '-20px'}}
                  >
                    <div className="row">
                      <div className="col-lg-6 clearfix bottommargin-sm">
                        <a
                          href="#"
                          className="social-icon si-dark si-colored si-facebook nobottommargin"
                          style={{marginRight: '10px'}}
                        >
                          <i className="icon-facebook" />
                          <i className="icon-facebook" />
                        </a>
                        <a href="#">
                          <small style={{display: 'block', marginTop: '3px'}}>
                            <strong>Like us</strong>
                            <br />
                            on Facebook
                          </small>
                        </a>
                      </div>
                      <div className="col-lg-6 clearfix">
                        <a
                          href="#"
                          className="social-icon si-dark si-colored si-rss nobottommargin"
                          style={{marginRight: '10px'}}
                        >
                          <i className="icon-rss" />
                          <i className="icon-rss" />
                        </a>
                        <a href="#">
                          <small style={{display: 'block', marginTop: '3px'}}>
                            <strong>Subscribe</strong>
                            <br />
                            to RSS Feeds
                          </small>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* .footer-widgets-wrap end */}
            </div>
            {/* Copyrights
              ============================================= */}
            <div id="copyrights">
              <div className="container clearfix">
                <div className="col_half">
                  Copyrights © 2019 All Rights Reserved by HertzAI Inc.
                  <br />
                  <div className="copyright-links">
                    <a href="#">Terms of Use</a> /{' '}
                    <a href="#">Privacy Policy</a>
                  </div>
                </div>
                <div className="col_half col_last tright">
                  <div className="fright clearfix">
                    <a
                      href="#"
                      className="social-icon si-small si-borderless si-facebook"
                    >
                      <i className="icon-facebook" />
                      <i className="icon-facebook" />
                    </a>
                    <a
                      href="#"
                      className="social-icon si-small si-borderless si-twitter"
                    >
                      <i className="icon-twitter" />
                      <i className="icon-twitter" />
                    </a>
                    <a
                      href="#"
                      className="social-icon si-small si-borderless si-gplus"
                    >
                      <i className="icon-gplus" />
                      <i className="icon-gplus" />
                    </a>
                    <a
                      href="#"
                      className="social-icon si-small si-borderless si-pinterest"
                    >
                      <i className="icon-pinterest" />
                      <i className="icon-pinterest" />
                    </a>
                    <a
                      href="#"
                      className="social-icon si-small si-borderless si-vimeo"
                    >
                      <i className="icon-vimeo" />
                      <i className="icon-vimeo" />
                    </a>
                    <a
                      href="#"
                      className="social-icon si-small si-borderless si-github"
                    >
                      <i className="icon-github" />
                      <i className="icon-github" />
                    </a>
                    <a
                      href="#"
                      className="social-icon si-small si-borderless si-yahoo"
                    >
                      <i className="icon-yahoo" />
                      <i className="icon-yahoo" />
                    </a>
                    <a
                      href="#"
                      className="social-icon si-small si-borderless si-linkedin"
                    >
                      <i className="icon-linkedin" />
                      <i className="icon-linkedin" />
                    </a>
                  </div>
                  <div className="clear" />
                  <i className="icon-envelope2" /> sales@hertzai.com{' '}
                  <span className="middot">·</span>{' '}
                  <i className="icon-headphones" /> +91-11-6541-6369{' '}
                  <span className="middot">·</span>{' '}
                  <i className="icon-skype2" /> HertzAIOnSkype
                </div>
              </div>
            </div>
            {/* #copyrights end */}
          </footer>
          {/* #footer end */}
        </div>
        {/* #wrapper end */}
        {/* Go To Top
      ============================================= */}
        <div id="gotoTop" className="icon-angle-up" />
        {/* External JavaScripts
      ============================================= */}
        {/* Footer Scripts
      ============================================= */}
        {/* SLIDER REVOLUTION 5.x SCRIPTS  */}
      </div>
    );
  },
});

export default HertzAI;
