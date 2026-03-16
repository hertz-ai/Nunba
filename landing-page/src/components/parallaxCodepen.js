/* eslint-disable */
import KnnResults from './knnresults';

import React, {useState, useEffect} from 'react';
import ContentLoader from 'react-content-loader';
import * as Icon from 'react-feather';
import {useMeasure} from 'react-use';
import Rellax from 'rellax';
import './parallax.scss';
//import {Parallax} from 'react-scroll-parallax';

class App extends React.Component {
  render() {
    return (
      <div>
        <Parallax speed="1.6">
          <div className="box"></div>
        </Parallax>
        <Parallax speed="1.2">
          <div className="red"></div>
        </Parallax>
      </div>
    );
  }
}

class Parallax extends React.Component {
  componentDidMount() {
    // window.addEventListener('scroll', this.scrollLoop, false)
    requestAnimationFrame(this.scrollLoop);
  }
  componentWillUnmount() {
    // window.removeEventListener('scroll', this.scrollLoop, false)
  }
  setPosition = (yPos) => {
    this.dom.style.transform = 'translate3d(0, ' + yPos + 'px, 0)';
    // this.dom.style.top = yPos + "px";
  };
  scrollLoop = () => {
    this.setPosition(window.scrollY * this.props.speed);
    requestAnimationFrame(this.scrollLoop);
  };
  render() {
    return <div ref={(dom) => (this.dom = dom)}>{this.props.children}</div>;
  }
}
export default Parallax;
// ReactDOM.render(<App/>, document.getElementById('app'))
