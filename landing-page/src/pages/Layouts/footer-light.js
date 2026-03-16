/* eslint-disable */
import React, {Component} from 'react';
import {Link} from 'react-router-dom';
import {Row, Col} from 'reactstrap';
import '../../css/pe-icon-7.css';
// ScrollUpButton removed — package not installed

class FooterLight extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <React.Fragment>
        <footer className="footer-light bg-light">
          <div className="container">
            <Row>
              <Col lg="3">
                <div className="text-dark">
                  <h3 className="mb-4 footer-list-title f-17">
                    HertzAI Pvt Ltd.
                  </h3>
                  <ul className="footer-icons list-inline mb-4">
                    {/* <li className="list-inline-item"><Link to="/privacy" className=""><i className="mdi mdi-linkedin"></i></Link></li> */}
                    {/* <li className="list-inline-item"><Link to="https://www.youtube.com/channel/UClzFvo8SECdyd0dVQhJ2Cbg" className=""><i className="mdi mdi-google"></i></Link></li> */}
                    {/* <li className="list-inline-item"><Link to="/privacy" className=""><i className="mdi mdi-twitter"></i></Link></li> */}

                    <li>
                      <a href="https://www.youtube.com/channel/UClzFvo8SECdyd0dVQhJ2Cbg">
                        <i className="fa fa-youtube-play"></i>
                      </a>
                    </li>
                    <li>
                      <a href="https://www.linkedin.com/company/hertz-ai/">
                        <i className="mdi mdi-linkedin"></i>
                      </a>
                    </li>
                    <li>
                      <a href="https://twitter.com/AiHertz?s=20">
                        <i className="mdi mdi-twitter"></i>
                      </a>
                    </li>
                  </ul>
                  <p className="copyright mt-3">
                    {new Date().getFullYear()} © HertzAI Pvt Ltd.
                  </p>
                </div>
              </Col>
              <Col lg="9">
                <Row>
                  <Col lg="3">
                    <div>
                      <p className="text-dark mb-4 footer-list-title f-17">
                        Company
                      </p>
                      <ul className="list-unstyled footer-list-menu">
                        <li>
                          <Link to="/About">About Us</Link>
                        </li>
                        <li>
                          <Link to="/privacy">Media & Press</Link>
                        </li>
                        {/* <li><Link to="https://etime.hertzai.com/jobs">Career</Link></li> */}
                        <li>
                          <a href="https://etime.hertzai.com/jobs">Career</a>
                        </li>
                        <li>
                          <Link to="/blog">Blog</Link>
                        </li>
                        <li>
                          <Link to="/partners">Our Partners</Link>
                        </li>
                      </ul>
                    </div>
                  </Col>
                  <Col lg="3">
                    <div>
                      <p className="text-dark mb-4 footer-list-title f-17">
                        Resources
                      </p>
                      <ul className="list-unstyled footer-list-menu">
                        <li>
                          <Link to="/contactUs">Help & Support</Link>
                        </li>
                        <li>
                          <Link to="/privacy">Privacy Policy</Link>
                        </li>
                        <li>
                          <Link to="/termsandconditions">
                            Terms & Conditions
                          </Link>
                        </li>
                        <li>
                          <Link to="/refundsandcancellations">
                            Cancel & Refund Policy
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </Col>
                  <Col lg="3">
                    <div>
                      <p className="text-dark mb-4 footer-list-title f-14">
                        More Info
                      </p>
                      <ul className="list-unstyled footer-list-menu">
                        <li>
                          <Link to="/contactUs">Pricing</Link>
                        </li>
                        <li>
                          <Link to="/privacy">For Marketing</Link>
                        </li>
                        <li>
                          <Link to="/deleteUser">Delete User </Link>
                        </li>
                        <li>
                          <Link to="/pupitdocs">Developer Documentation</Link>
                        </li>
                        <li>
                          <Link to="/privacy">For Agencies</Link>
                        </li>
                        <li>
                          <Link to="/">Our Apps</Link>
                        </li>
                      </ul>
                    </div>
                  </Col>
                  <Col lg="3">
                    <div>
                      <p className="text-dark mb-4 footer-list-title f-17">
                        Help center
                      </p>
                      <ul className="list-unstyled footer-list-menu">
                        <li>
                          <Link to="/privacy">Accounting </Link>
                        </li>
                        <li>
                          <Link to="/contactUs">Billing</Link>
                        </li>
                        <li>
                          <Link to="/contactUs">General Question</Link>
                        </li>
                      </ul>
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>
        </footer>
        {/* scroll-up button removed — legacy package not installed */}
      </React.Fragment>
    );
  }
}

export default FooterLight;
