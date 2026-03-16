/* eslint-disable */
import React, {Component} from 'react';

import {Link} from 'react-router-dom';

class Cta extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <React.Fragment>
        <section className="section bg-custom">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-10">
                <div className="cta-content text-center text-white">
                  <h3 className="mb-4">Best Solutions for Your Business</h3>
                  <p className="text-light f-16">
                    It is a long established fact that a reader will be
                    distracted by the readable content of a page when looking at
                    its layout. The point of using Lorem Ipsum is that it has
                    normal of letters
                  </p>
                  <div className="pt-3">
                    <Link to="#" className="btn btn-custom-white">
                      Free Trial <i className="mdi mdi-arrow-right"></i>{' '}
                    </Link>
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

export default Cta;
