import React, {Component} from 'react';
import {Link} from 'react-router-dom';
import {Row, Col} from 'reactstrap';
// ScrollUpButton removed — package not installed

import '../../css/pe-icon-7.css';

class Footer extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <React.Fragment>
        <footer className="bg-footer">
          <div className="container">
            <Row>
              <Col lg="3">
                <div className="text-white">
                  <h3
                    className="mb-4 footer-list-title f-17"
                    style={{color: '#fff'}}
                  >
                    HertzAI
                  </h3>
                  <ul className="footer-icons list-inline mb-4">
                    <li className="list-inline-item">
                      <Link to="#" className="">
                        <i className="mdi mdi-facebook"></i>
                      </Link>
                    </li>
                    <li className="list-inline-item">
                      <Link to="#" className="">
                        <i className="mdi mdi-twitter"></i>
                      </Link>
                    </li>
                    <li className="list-inline-item">
                      <Link to="#" className="">
                        <i className="mdi mdi-instagram"></i>
                      </Link>
                    </li>
                    <li className="list-inline-item">
                      <Link to="#" className="">
                        <i className="mdi mdi-google"></i>
                      </Link>
                    </li>
                  </ul>
                  <p className="copyright mt-3">
                    {new Date().getFullYear()} © HertzAI.
                  </p>
                </div>
              </Col>
              <Col lg="9">
                <Row>
                  <Col lg="3">
                    <div>
                      <p className="text-white mb-4 footer-list-title f-17">
                        Company
                      </p>
                      <ul className="list-unstyled footer-list-menu">
                        <li>
                          <Link to="About">About Us</Link>
                        </li>
                        <li>
                          <Link to="#">Media & Press</Link>
                        </li>
                        <li>
                          <Link to="#">Career</Link>
                        </li>
                        <li>
                          <Link to="#">Blog</Link>
                        </li>
                      </ul>
                    </div>
                  </Col>
                  <Col lg="3">
                    <div>
                      <p className="text-white mb-4 footer-list-title f-17">
                        Resources
                      </p>
                      <ul className="list-unstyled footer-list-menu">
                        <li>
                          <Link to="#">Help & Support</Link>
                        </li>
                        <li>
                          <Link to="#">Privacy Policy</Link>
                        </li>
                        <li>
                          <Link to="#">Terms & Conditions</Link>
                        </li>
                      </ul>
                    </div>
                  </Col>
                  <Col lg="3">
                    <div>
                      <p className="text-white mb-4 footer-list-title f-17">
                        More Info
                      </p>
                      <ul className="list-unstyled footer-list-menu">
                        <li>
                          <Link to="#">Pricing</Link>
                        </li>
                        <li>
                          <Link to="#">For Marketing</Link>
                        </li>
                        <li>
                          <Link to="#">For CEOs </Link>
                        </li>
                        <li>
                          <Link to="#">For Agencies</Link>
                        </li>
                        <li>
                          <Link to="#">Our Apps</Link>
                        </li>
                      </ul>
                    </div>
                  </Col>
                  <Col lg="3">
                    <div>
                      <p className="text-white mb-4 footer-list-title f-17">
                        Help center
                      </p>
                      <ul className="list-unstyled footer-list-menu">
                        <li>
                          <Link to="#">Accounting </Link>
                        </li>
                        <li>
                          <Link to="#">Billing</Link>
                        </li>
                        <li>
                          <Link to="#">General Question</Link>
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

export default Footer;
