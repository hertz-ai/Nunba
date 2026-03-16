/* eslint-disable */
import React, {Component} from 'react';
import {Link} from 'react-router-dom';
//import '../../css/w3cNavstyles.css';
import '../../css/font-awesome.min.css';

class HeaderW3c extends Component {
  myFunction() {
    var x = document.getElementById('myTopnav');
    if (x.className === 'topnav') {
      x.className += ' responsive';
    } else {
      x.className = 'topnav';
    }
  }

  render() {
    return (
      <React.Fragment>
        <div>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
          />
          <div className="topnav" id="myTopnav">
            <a href="#home" className="active">
              Home
            </a>
            <a href="#news">News</a>
            <a href="#contact">Contact</a>
            <div className="dropdown">
              <button className="dropbtn">
                Dropdown
                <i className="fa fa-caret-down" />
              </button>
              <div className="dropdown-content">
                <a href="#">Link 1</a>
                <a href="#">Link 2</a>
                <a href="#">Link 3</a>
              </div>
            </div>
            <a href="#about">About</a>
            <a
              href="javascript:void(0);"
              style={{fontSize: '15px'}}
              className="icon"
              onClick={this.myFunction}
            >
              ☰
            </a>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default HeaderW3c;
