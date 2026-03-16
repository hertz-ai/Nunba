/* eslint-disable */
import React, {Component} from 'react';
import {Link} from 'react-router-dom';

import {ScrollTo} from 'react-scroll-to';
// Layouts
import HeaderMulti from '../pages/Layouts/header-multi';
import HeaderW3c from '../pages/Layouts/header-w3c';
import Footer from '../pages/Layouts/footer';

// Shared
import AboutUs from '../pages/SubPages/Multipurpose/about-us';
import Features from '../pages/SubPages/Multipurpose/features';
import Services from '../pages/SubPages/Multipurpose/services';
import Cta from '../pages/SubPages/Multipurpose/cta';
import Testimonial from '../pages/SubPages/Multipurpose/testimonial';
import Team from '../pages/SubPages/Multipurpose/team';
import Client from '../pages/SubPages/Multipurpose/client';
import Contact from '../pages/SubPages/Multipurpose/contact';

// Modal Video
import ModalVideo from 'react-modal-video';
import '../../node_modules/react-modal-video/scss/modal-video.scss';
import '../css/pe-icon-7.css';
import '../css/style.css';
import '../css/style.css.map';
import '../_helper.scss';
import '../css/bootstrap.min.css';
import {logger} from '../utils/logger';
//import '../css/materialdesignicons.min.css';
// import M from 'materialize-css';

class homeBusiness extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
    };
    this.openModal = this.openModal.bind(this);
  }
  openModal() {
    this.setState({isOpen: true});
  }

  componentDidMount() {
    document.body.classList = '';
    window.addEventListener('scroll', this.scrollNavigation, true);
  }

  // function ShowPage = ({activePage}) =>
  // <h1>{activePage}</h1>;

  scrollNavigation = () => {
    var doc = document.documentElement;
    var top = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
    if (top > 80) {
      // document.getElementById('nav-bar').classList.add('nav-sticky');
      logger.log('>80');
    } else {
      // document.getElementById('nav-bar').classList.remove('nav-sticky');
      logger.log('<=80');
    }
  };

  showPage = () => {
    logger.log('Inside showPage function>!!');
    const greeting = this.props.pageName;
    logger.log('page to be shown -> ' + this.props.pageName);
    var pageNames = this.props.pageName;
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
    let body = this.showPage();
    return (
      <React.Fragment>
        {/*  Header */}
        <HeaderMulti />
        {/* <HeaderW3c/> */}
        {/* Home Section */}
        {/* <h1>{this.props.name}</h1> */}
        <section className="bg-home" id="home">
          <div className="home-center">
            <div className="home-desc-center">
              <div className="container">
                <div className="row">
                  <div className="col-lg-8">
                    <div className="home-title text-white">
                      <h1>
                        <i className="pe-7s-rocket"></i>
                      </h1>
                      <h5 className="mb-3">Discover Cortext Today.</h5>
                      <h1>Extract invoice data faster than ever.</h1>
                      <p className="mt-4">
                        Use AI to capture business data like a human. Set
                        accounts payable workflows that reduce manual data entry
                        and avoid error-prone OCR rules and templates.
                      </p>
                      <div className="watch-video mt-5">
                        <Link to="#" className="btn btn-custom mr-4">
                          Free Trail
                        </Link>
                        <Link
                          to="#"
                          onClick={this.openModal}
                          className="video-play-icon text-white"
                        >
                          <i className="mdi mdi-play play-icon-circle mr-2"></i>{' '}
                          <span>Watch The Video!</span>
                        </Link>
                        <ModalVideo
                          channel="youtube"
                          isOpen={this.state.isOpen}
                          videoId="L61p2uyiMSo"
                          onClose={() => this.setState({isOpen: false})}
                        />
                      </div>
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
        {body}
        {/* <AboutUs />
                <Features />
                <Services />
                <Cta />
                <Testimonial />
                <Team />
                <Client /> */}
        {/* <Contact /> */}

        {/* Footer */}
        <Footer />
      </React.Fragment>
    );
  }
}

export default homeBusiness;
