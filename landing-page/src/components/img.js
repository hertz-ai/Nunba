/* eslint-disable */
import React from 'react';
import Progress from '@mui/material/CircularProgress';

class Img extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: '',
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.loadImage(this.props.src);
  }

  componentDidUpdate(prevProps) {
    if (this.props.src !== prevProps.src) {
      this.loadImage(this.props.src);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  setImageStatus(status) {
    if (!this.mounted) {
      return;
    }
    this.setState({status});
    this.props.setStatus(status);
  }

  loadImage(src) {
    if (!src) return;

    this.setImageStatus('progress');
    const img = new Image();
    img.onload = () => {
      this.setImageStatus('success');
      if (this.props.onSuccess) {
        this.props.onSuccess(img);
      }
    };
    img.onerror = () => {
      this.setImageStatus('error');
    };
    img.src = src;
  }

  render() {
    return this.state.status === 'progress' ? (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Progress style={{color: '#fff'}} />
      </div>
    ) : this.state.status === 'success' ? (
      <img src={this.props.src} alt="" className={this.props.className} />
    ) : this.state.status === 'error' ? (
      <span style={{color: '#fff'}}>An error occured while load Image</span>
    ) : null;
  }
}

export default Img;
