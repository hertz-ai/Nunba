/* eslint-disable */
import React, {Component} from 'react';
import RBCarousel from 'react-bootstrap-carousel';
import 'react-bootstrap-carousel/dist/react-bootstrap-carousel.css';

import img1 from '../../../images/testi/img-1.png';
import img2 from '../../../images/testi/img-2.png';
import img3 from '../../../images/testi/img-3.png';
import {logger} from '../../../utils/logger';

class Testimonial extends Component {
  constructor(props) {
    super(props);
    this.state = {
      autoplay: true,
    };
  }

  onSelect = (active, direction) => {
    logger.log(`active=${active} && direction=${direction}`);
  };
  visiableOnSelect = (active) => {
    logger.log(`visiable onSelect active=${active}`);
  };
  slideNext = () => {
    this.slider.slideNext();
  };
  slidePrev = () => {
    this.slider.slidePrev();
  };
  goToSlide = () => {
    this.slider.goToSlide(4);
  };
  autoplay = () => {
    this.setState({autoplay: !this.state.autoplay});
  };
  _changeIcon = () => {
    let {leftIcon, rightIcon} = this.state;
    leftIcon = leftIcon ? undefined : <span className="fa fa-glass" />;
    rightIcon = rightIcon ? undefined : <span className="fa fa-music" />;
    this.setState({leftIcon, rightIcon});
  };

  render() {
    return (
      <React.Fragment>
        <section className="section bg-light" id="testimonial">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-7">
                <div className="title text-center mb-5">
                  <p className="text-uppercase text-muted mb-2 f-13 subtitle">
                    Testimonial
                  </p>
                  <h3>What clients Say</h3>
                </div>
              </div>
            </div>

            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div id="carouselExampleIndicators" className="carousel slide">
                  <div className="carousel-inner">
                    <div id="customCarousel">
                      <RBCarousel
                        version={4}
                        autoplay={this.state.autoplay}
                        pauseOnVisibility={true}
                        onSelect={this.visiableOnSelect}
                        slideshowSpeed={1000}
                      >
                        <div className="item">
                          <div className="carousel-item active">
                            <div className="testi text-center">
                              <p className="text-muted">
                                The European languages are members of the same
                                family. Their separate existence is a myth. For
                                science, music, sport, etc, Europe uses the same
                                vocabulary. The languages only differ in their
                                grammar, their pronunciation and their most
                                common words.
                              </p>
                              <img
                                src={img1}
                                alt=""
                                className="testi-img avatar-md img-fluid rounded-circle mx-auto d-block"
                              />
                              <p className="text-muted mb-1 mt-3">
                                {' '}
                                - Landing page User
                              </p>
                              <h5 className="f-18">Mathew Herbert</h5>
                            </div>
                          </div>
                        </div>

                        <div className="item">
                          <div className="carousel-item active">
                            <div className="testi text-center">
                              <p className="text-muted">
                                It is a long established fact that a reader will
                                be distracted by the readable content of a page
                                when looking at its layout. The point of using
                                Ipsum is that it has normal distribution of
                                letters, as opposed to using making it look like
                                readable English
                              </p>
                              <img
                                src={img2}
                                alt=""
                                className="testi-img avatar-md img-fluid rounded-circle mx-auto d-block"
                              />
                              <p className="text-muted  mb-1 mt-3">
                                {' '}
                                - Landing page User
                              </p>
                              <h5 className="f-18">Richard Kirtley</h5>
                            </div>
                          </div>
                        </div>
                        <div className="item">
                          <div className="carousel-item active">
                            <div className="testi text-center">
                              <p className="text-muted">
                                Lorem ipsum dolor sit amet, consectetuer
                                adipiscing elit. Aenean commodo ligula eget
                                dolor. Aenean massa. Cum sociis natoque
                                penatibus et magnis dis parturient montes,
                                nascetur ridiculus mus. Donec quam felis,
                                ultricies nec, pellentesque eu, pretium quis,
                                sem.
                              </p>
                              <img
                                src={img3}
                                alt=""
                                className="testi-img avatar-md img-fluid rounded-circle mx-auto d-block"
                              />
                              <p className="text-muted mb-1 mt-3">
                                {' '}
                                - Landing page User
                              </p>
                              <h5 className="f-18">Derrick Marshall</h5>
                            </div>
                          </div>
                        </div>
                      </RBCarousel>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </React.Fragment>
    );
  }
}

export default Testimonial;
