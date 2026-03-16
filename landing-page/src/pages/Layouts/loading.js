/* eslint-disable */
import React, {Component} from 'react';

class Loading extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <React.Fragment>
        <div id="preloader">
          <div id="status">
            <div className="spinner">Loading...</div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default Loading;
