/* eslint-disable */
import React, {Component} from 'react';
import {Link} from 'react-router-dom';
import {ScrollTo} from 'react-scroll-to';
import styled from 'styled-components';
// Layouts
// import Footer from '../pages/Layouts/footer';
// Shared
import Client from '../pages/SubPages/Multipurpose/client';
import Contact from '../pages/SubPages/Multipurpose/contact';
// import DemoVideo from '../pages/SubPages/Multipurpose/demoVideo';
import DiscoverPotential from '../pages/SubPages/Multipurpose/discoverPotential';
import Partners from '../pages/SubPages/Multipurpose/partners';
import Security from '../pages/SubPages/Multipurpose/Security';
import {logger} from '../utils/logger';
// Modal Video
import ModalVideo from 'react-modal-video';
import '../../node_modules/react-modal-video/scss/modal-video.scss';
import '../css/pe-icon-7.css';
import '../css/style.css';
import '../css/style.css.map';
import '../_helper.scss';
// import '../css/bootstrap.min.css';
//import '../css/materialdesignicons.min.css';
// import M from 'materialize-css';
import {stackOffsetNone} from 'd3';
import DemoVideo from './demoVideo';
import HevolveDemo from './hevolveDemo';
import Register from './register';
import Typography from '@mui/material/Typography';
import Spacer from './Spacer';
import FooterLight from '../pages/Layouts/footer-light';
import HeaderNano from '../pages/Layouts/header';
import HeaderMulti from '../pages/Layouts/header-multi';
import AboutUs from '../pages/SubPages/Multipurpose/about-us';
import Cta from '../pages/SubPages/Multipurpose/cta';
import Features from '../pages/SubPages/Multipurpose/features';
import Services from '../pages/SubPages/Multipurpose/services';
import Team from '../pages/SubPages/Multipurpose/team';
import Testimonial from '../pages/SubPages/Multipurpose/testimonial';
import MetaTags from 'react-meta-tags';
import Particles from 'react-particles-js';
// import Particles from "./particles";
// import CanvasComponent from './canvasDemo';
class recap extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      hevolvedroid: false,
    };
    this.openModal = this.openModal.bind(this);
    this.routeToContactUs = this.routeToContactUs.bind(this);
  }
  routeToContactUs() {
    // document.querySelector("#mySidenav > li:nth-child(8) > a").click();
    document
      .querySelector(
        '#root > div > header > div.navbar-wrapper.navbar-fixed > div > div > div.navbar-nav-wrapper > ul > li:nth-child(10) > a'
      )
      .click();
  }
  openModal() {
    logger.log('Entered method - openModal()');
    const videoPart = document.getElementById('videoPart');
    videoPart.style.animationFillMode = 'none';
    this.setState({isOpen: true});
  }

  componentDidMount() {
    document.body.classList = '';
    // window.addEventListener('scroll', this.scrollNavigation, true);
  }

  // function ShowPage = ({activePage}) =>
  // <h1>{activePage}</h1>;
  componentDidMount() {
    const userAgent = navigator.userAgent;
    this.setState({hevolvedroid: userAgent.includes('hevolvedroid')});
  }
  scrollNavigation = () => {
    const doc = document.documentElement;
    const top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
    if (top > 80) {
      document.getElementById('nav-bar').classList.add('nav-sticky');
      logger.log('>80');
      document.getElementById('dropdownId').className = 'dropdownsticky-drop';
      // now add class for sticky
      // document.getElementsByClassName('dropdownsticky-drop')[0].className = "dropdown";
    } else {
      document.getElementById('nav-bar').classList.remove('nav-sticky');
      logger.log('<=80');

      // now remove class for sticky
      document.getElementById('dropdownId').className = 'dropdown';
      // document.getElementsByClassName('dropdown')[0].className += "sticky-drop";
      // document.getElementsByClassName('dropdown')[0].className = document.getElementsByClassName('dropdown')[0].className + "sticky-drop";
    }
  };

  showPage = () => {
    logger.log('Inside showPage function>!!');
    const greeting = this.props.pageName;
    logger.log('page to be shown -> ' + this.props.pageName);
    const pageNames = this.props.pageName;
    switch (pageNames) {
      case 'aboutus':
        return <AboutUs />;
      case 'features':
        return <Features />;
      case 'services':
        return <Services />;
      case 'cta':
        return <Cta />;
      default:
        return <Contact />;
    }
    return <h1>{greeting}</h1>;
  };

  render() {
    const body = this.showPage();
    // Create a Title component that'll render an <h1> tag with some styles
    // const Title = styled.h1`
    // font-size: 56px;
    // font-weight: lighter;
    // margin: 20px 0;
    // text-align: center;
    // font-familiy: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji !important";
    // `;
    const {hevolvedroid} = this.state;

    const navbar = hevolvedroid ? null : <HeaderNano fixed={true} />;
    const scrollToRegister = () => {
      window.scrollTo({
        behavior: 'smooth',
        top:
          document.getElementById('register').getBoundingClientRect().top -
          document.body.getBoundingClientRect().top -
          30,
      });
    };
    return (
      <React.Fragment>
        <MetaTags>
          <title>Hevolve: The AI companion app to teach students</title>
          <meta
            property="og:description"
            content="A team of passionate people who believe in improving everyone's life using AI. We build products to solve real world problems"
          />

          <meta
            id="og-description"
            property="og:description"
            content="Hevolve: A team of passionate people who believe in improving everyone's life using AI. We build products to solve real world problems"
          />

          <meta
            id="og-description"
            property="og:description"
            content="Hevolve is an AI-enabled app which acts as a personal assistant for students.Hevolve offers real-time doubt solving and feedback to improve understanding."
          />
          <meta
            id="meta-description"
            name="description"
            content="Hevolve is an AI-enabled app which acts as a personal assistant for students.Hevolve offers real-time doubt solving and feedback to improve understanding."
          />

          <meta
            id="og-description"
            property="og:description"
            content="Hevolve is an AI-enabled app which acts as a personal assistant for students.Hevolve offers real-time doubt solving and feedback to improve understanding."
          />

          <meta
            id="og-title"
            property="og:title"
            content="Hertzai | Hevolve: The AI companion app to teach students"
          />
          <meta id="og-image" property="og:image" content="/logo-light.png" />
          <meta id="og-image" property="og:image" content="/logo-light.png" />
        </MetaTags>
        {/*  Header */}
        {/* <HeaderMulti style={{"background-image": "url(\"../images/bg-heart-0-1.jpg\")"}}/> */}

        {/* <style jsx="true">
          {`
          .navbar-custom .navbar-nav li a {
            color: #fff;
          }
          #submit{
            cursor: pointer;
          }
          `}
        </style>
        <HeaderMulti style={{".navbar-custom .navbar-nav li a" : "#ffffff"}}
        /> */}

        {navbar}
        {/* Home Section */}
        {/* <h1>{this.props.name}</h1> */}
        {/* <section className="bg-home" style={{"background-image" : "url(\"../static/media/bg-heart-0-1.jpg\")"}} id="home"> */}
        {/* <section className="bg-home" style={{"background-image" : `url(require("../public/bg-heart-0-1.jpg"))`}} id="home"> */}
        {/* <section className="bg-home" style={{"backgroundImage" : `ur0l("http://localhost:3000/static/media/BG_ai_teaches.07c92876.jpg")`}} id="home"> */}

        {/* particles animation */}
        <div style={{overflow: 'hidden', backgroundColor: 'white'}}>
          <Particles
            style={{position: 'absolute'}}
            height="100vh"
            params={{
              particles: {
                color: {
                  // value: '#1198c7',
                  value: '',
                },
                line_linked: {
                  color: {
                    value: '#cdcdcd',
                  },
                },
                number: {
                  value: 100,
                  density: {
                    enable: true,
                    value_area: 1000,
                  },
                },
              },
              interactivity: {
                events: {
                  onhover: {
                    enable: true,
                    mode: 'grab',
                  },
                  modes: {
                    grab: {
                      distance: 140,
                      line_linked: {
                        opacity: 1,
                      },
                    },
                  },
                },
              },
            }}
          />
          <section
            className="bg-home"
            // style={{'background-image': `url("/human_computer.png")`}}
            style={{
              // 'background-image': `url("/white_cover.jpeg")`,
              backgroundImage: `url("/Man_face_new_151.png")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
            id="home"
          >
            {/* <section className="bg-home" id="home"> */}
            <div className="home-center">
              <div className="home-desc-center">
                <div className="container">
                  <div className="row">
                    <div className="col-lg-5 order-1">
                      <div
                        className="home-title text-white fadeInUp"
                        style={{animationFillMode: 'none'}}
                      >
                        {/* <h1><i className="pe-7s-rocket"></i></h1>                                             */}
                        <h1
                          className="mb-3"
                          style={{
                            animationDelay: '0.8s',
                          }}
                        >
                          Learn the right way
                        </h1>
                        <p
                          className="mt-4"
                          style={{
                            animationDelay: '0.8s',
                            cursor: 'context-menu',
                            color: 'black',
                            fontWeight: '400',
                          }}
                        >
                          Having a learning difficulty does not make someone
                          less intelligent, it just means they do not have
                          resources to clarify their doubts and create a deeper
                          understanding in this fast paced world.
                        </p>

                        {/* <DemoVideo videoId={'NVXYuHa7MLc'} learnMore={"none"}/> */}
                        {/* <DemoVideo videoId={'NVXYuHa7MLc'} /> */}
                        <DemoVideo
                          videoId={'IzHpdcMNRGY'}
                          buttonColor={'#1198c7'}
                          style={{animationDelay: '.3s'}}
                          component="hevolve"
                          scrollToRegister={scrollToRegister}
                        />

                        {/* <div style={{animationDelay: '.3s'}}>
                      </div> */}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="mouse-down text-center">
                        <ScrollTo>
                          {({scrollTo}) => (
                            <Link
                              to="#about"
                              onClick={() => scrollTo({y: 710, smooth: true})}
                              className="down-scroll text-dark"
                            >
                              <i className="mdi mdi-arrow-down h4"></i>
                            </Link>
                          )}
                        </ScrollTo>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
        {body}
        {/* <DemoVideo/> */}
        <Partners />
        {/* <Spacer h={120} /> */}
        <DiscoverPotential />
        <Spacer h={120} />
        <div id="register"></div>
        <Register component="register" />

        {/* This page for Demo page  */}
        {/* <Spacer h={120} />
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
        <HevolveDemo /> */}

        <Spacer h={120} />
        <Security />
        {/* <AboutUs />
                <Features />
                <Services />
                <Cta />
                <Testimonial />
                <Team />
                <Client /> */}
        {/* <Contact /> */}

        {/* Footer */}
        <FooterLight />
      </React.Fragment>
    );
  }
}

export default recap;
