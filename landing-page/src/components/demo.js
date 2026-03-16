/* eslint-disable */
import React from 'react';
import 'lazysizes';
import {withStyles} from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Progress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
// import GetAppIcon from "@mui/icons-material/GetApp"
import CopyIcon from '@mui/icons-material/FilterNone';
import copy from 'clipboard-copy';
import AbortController from 'abort-controller';
import {saveAs} from 'file-saver';

import {logger} from '../utils/logger';
import Preview from './preview';
import Thumbnails from './thumbnails';

// get our fontawesome imports
import {
  faPlusCircle,
  faCopy,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

const styles = (theme) => ({
  tabsRoot: {
    minHeight: 'auto',
  },

  tabRoot: {
    opacity: 1,
    whiteSpace: 'nowrap',
    minHeight: 'auto',
    minWidth: 'auto',
    maxWidth: 280,
    marginLeft: 15,
    marginRight: 15,
    paddingLeft: 0,
    paddingRight: 0,
    color: '#fff',
  },
  tabSelected: {
    fontWeight: 'bold',
  },
  indicator: {
    background: '#61FFEC',
  },
  demoBox: {
    display: 'flex',
    flexWrap: 'wrap',
    boxShadow: '0 2px 8px 0 rgba(60, 64, 67, .2)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  col1: {
    minHeight: 640,
    maxHeight: 640,
    flex: '1 1 480px',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    // background: "#1A1F3C",
    // background: "linear-gradient(to right, #f800a4, #0078ff)",
    background: '#505050',
    padding: 15,
  },
  col2: {
    maxHeight: 640,
    flex: '1 1 480px',
    position: 'relative',
    // background: "#303A70",
    background: '#505050',
    // background: "linear-gradient(to right, #f800a4, #0078ff)",
    color: '#fff',
  },
  jsonBox: {
    border: 0,
    borderRadius: 4,
    padding: 15,
    fontSize: 12,
    outline: 0,
    width: '100%',
    height: '100%',
    fontFamily: 'Menlo, Monaco, Consolas, Monospace',
    resize: 'none',
    overflow: 'auto',
    display: 'block',
    background: '#fff',
    color: '#40424F',
    whiteSpace: 'pre-wrap',
  },
  responseImage: {
    width: '100%',
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  },
  outputHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    color: '#fff',
  },
  iconWrapper: {
    width: '45px',
    height: '45px',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    '&:hover': {
      color: '#61FFEC',
    },
  },
  icon: {},
  form: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
    background: '#FFFFFF',
    // boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.04)",
    borderRadius: 4,
    // padding: 15,
    fontSize: 12,
    maxWidth: '100%',
    maxHeight: '100%',
    overflow: 'auto',
  },
  fieldBox: {
    // flex: "1 1 50%",
    padding: '20px 15px',
    borderRadius: 4,
    minWidth: 200,
  },
  field: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    borderRadius: 4,
    padding: '4px 10px',
    background: '#E1E5F9',
    color: '#6270C8',
    display: 'inline-block',
    alignSelf: 'flex-start',
  },
  value: {
    padding: '4px 10px',
    marginTop: 6,
    borderRadius: 4,
    background: '#E6E6E6',
    color: '#4C5484',
    display: 'block',
    fontWeight: 'bold',
    flex: 1,
  },
  boxWrapper: {
    width: '100%',
    height: '100%',
    padding: 15,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mask: {
    background: '#0002',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    filter: 'blur(4px)',
  },
});

const COPIED_MSG = 'Copied!';

class Demo extends React.Component {
  constructor(props) {
    super(props);

    this.mounted = false;

    this.state = {
      fileSrc: '',
      fileName: '',
      isUploadedFile: false,
      response: {},
      responseStatus: '',
      imageStatus: '',
      demo: [],
      activeTab: 'json',
      activeIndex: 0,
      open: false,
      tooltipMsg: 'Copy Response',
      boxes: [],
      selectedImage: 0,
    };

    this.timeout = 0;
    this.controller1 = {};
    this.controller2 = {};
    this.previewBox2Ref = React.createRef();
    this.previewWrapperRef = React.createRef();
    this.postData = this.postData.bind(this);
  }

  componentDidMount() {
    this.mounted = true;
    this.transformDemo();
    if (this.props.demo[this.state.activeIndex].demo_type === 'OCR') {
      this.setState({
        activeTab: 'table',
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.demo !== this.props.demo) {
      this.transformDemo();
    }
    if (prevState.demo !== this.state.demo) {
      this.handleThumbnailClick(0);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  transformDemo = () => {
    const {demo} = this.props;
    const _demo = demo.map((item) => {
      item.output || (item.output = {});

      try {
        if (typeof item.output.result === 'object') {
          // skip
        } else if (typeof item.output.result === 'string') {
          item.output.result = JSON.parse(item.output.result);
        } else {
          throw 'result is not an object';
        }
      } catch (error) {
        console.error(error);
        item.output.result = {};
      }

      return item;
    });

    this.setState({
      demo: _demo,
      activeIndex: 0,
    });
  };

  reset = () => {
    this.controller && this.controller.abort();
    this.controller = new (window.AbortController || AbortController)();
    URL.revokeObjectURL(this.imageUrl);

    this.setState({
      // fileSrc: "",
      // fileName: "",
      output: {},
      output_type: '',
      responseStatus: '',
      imageStatus: '',
      boxes: [],
      isUploadedFile: false,
    });
  };

  delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  handleThumbnailClick = async (index) => {
    this.controller1.abort && this.controller1.abort('aborted');
    this.controller2.abort && this.controller2.abort('aborted');
    this.controller1 = {};
    this.controller2 = {};
    this.reset();
    if (!this.state.demo || this.state.demo.length === 0) return;

    await this.delay(50);
    this.setState({
      responseStatus: 'progress',
      activeIndex: index,
      selectedImage: index,
      //activeTab: this.state.demo[index].demo_type === 'OCR' ? 'table' : 'json',
      activeTab: 'json',
      fileSrc: this.state.demo[index].input,
      fileName: this.state.demo[index].input,
    });
    this.responsePromise(this.controller1, index)
      .then((response) => {
        this.setState({
          responseStatus: 'success',
          output: response.output || {},
          output_type: response.output_type,
          boxes: response.output.result.predictions,
        });
      })
      .catch((err) => {
        console.error(err);
        this.setState({
          responseStatus: 'error',
        });
      });
  };

  responsePromise = (controller, index) => {
    const response = this.state.demo[index];

    return new Promise((resolve, reject) => {
      controller.abort = reject;
      if (response) {
        setTimeout(() => {
          return resolve(response);
        }, 2000);
      } else {
        reject('empty response');
      }
    });
  };

  handleTabChange = (_, value) => {
    this.setState({
      activeTab: value,
    });
  };

  copy = () => {
    let content = JSON.stringify(this.state.output, null, 2);
    this.setState({
      open: false,
    });
    copy(content).then(() => {
      this.setState({
        open: true,
        tooltipMsg: COPIED_MSG,
      });

      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        if (this.mounted) {
          this.setState({
            open: false,
          });
        }
      }, 3000);
    });
  };

  onOpen = () => {
    this.setState({
      open: true,
      tooltipMsg: 'Copy Response',
    });
  };

  onClose = () => {
    // if (this.state.tooltipMsg === COPIED_MSG) return
    this.setState({
      open: false,
    });
  };

  download = () => {
    let content = JSON.stringify(this.state.output, null, 2);
    var blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
    saveAs(blob, 'response.json');
  };

  // Example POST method implementation:
  postData = (event) => {
    logger.log('Entered postData()');
    let files = event.target.files;
    if (files.length === 0) return;

    this.reset();

    let file = files[0];
    this.imageUrl = URL.createObjectURL(file);
    logger.log('The image url ->> ' + this.imageUrl);
    this.setState({
      responseStatus: 'progress',
      fileSrc: this.imageUrl,
      fileName: file.name,
      isUploadedFile: true,
      selectedImage: -1,
    });

    logger.log('Calling upload file method!!');
    this.handleImageUpload(event);

    var url =
      'https://cors-anywhere.herokuapp.com/' +
      'http://106.51.152.62:84/triggerWrapFromLandin';
    var data = {
      folderPath: '/home/sathish/gitRepos/HertzDrive/freshMount/SharedDrive',
      // fileName: 'Sample_Invoice_Template_by_PayPal.jpg',
      fileName: file.name,
      triggerType: 'cortext',
      publayFlag: 'false',
      tesseractFlag: 'false',
      objectList: null,
    };

    var formData = new FormData();
    formData.append(
      'folderPath',
      '/home/sathish/gitRepos/HertzDrive/freshMount/SharedDrive'
    );
    // formData.append('fileName', 'Sample_Invoice_Template_by_PayPal.jpg');
    formData.append('fileName', file.name);
    formData.append('triggerType', 'cortext');
    formData.append('publayFlag', 'false');
    formData.append('tesseractFlag', 'false');

    // Default options are marked with *
    // 'Content-Type': 'application/json',
    fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      // mode: 'no-cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        Accept: '*/*',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: formData, // body data type must match "Content-Type" header
    })
      //.then(function (response) {
      .then((response) => {
        if (response.status !== 200) {
          logger.log(
            'Looks like there was a problem. Status Code: ' + response.status
          );
          return;
        }
        // Examine the text in the response
        response.json().then((data) => {
          logger.log(data);

          this.setState({
            responseStatus: 'success',
            fileName: 'result.input',
            boxes: [],
            output: {
              result: {
                predictions: data,
              },
            },
          });
          logger.log('Completed setting state!!');
        });
      })
      .catch(function (err) {
        logger.log('Fetch Error :-S', err);
      });
  };

  // postData('https://example.com/answer', { answer: 42 })
  //   .then(data => {
  //     logger.log(data); // JSON data parsed by `data.json()` call
  //   });

  callCortext = (event) => {
    var myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');

    var formData = new FormData();
    formData.append(
      'folderPath',
      '/home/sathish/gitRepos/HertzDrive/freshMount/SharedDrive'
    );
    formData.append('fileName', 'Sample_Invoice_Template_by_PayPal.jpg');
    formData.append('triggerType', 'cortext');
    formData.append('publayFlag', 'false');
    formData.append('tesseractFlag', 'false');

    var raw = {
      folderPath: '/home/sathish/gitRepos/HertzDrive/freshMount/SharedDrive',
      fileName: 'Sample_Invoice_Template_by_PayPal.jpg',
      triggerType: 'cortext',
      publayFlag: 'false',
      tesseractFlag: 'false',
    };

    var requestOptions = {
      method: 'POST',
      mode: 'no-cors',
      body: raw,
      headers: myHeaders,
      redirect: 'follow',
    };

    fetch('http://106.51.152.62:84/triggerWrapper', requestOptions)
      .then((response) => response.text())
      .then((result) => logger.log(result))
      .catch((error) => logger.log('error', error));
  };

  handleImageUpload = (event) => {
    // var formDataLogin = new FormData();
    // formDataLogin.append('username', 'hertzAI');
    // formDataLogin.append('password', 'hertzAI');

    // fetch('https://www.mcgroce.com/hertzDrive-v1.0/homePage', {
    //   method: 'POST',
    //   mode: 'no-cors',
    //   credentials: 'include',
    //   body: formDataLogin,
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Authorization: 'Basic aGVydHpBSTpoZXJ0ekFJ',
    //   },
    // })
    //   .then((res) => logger.log(res.headers.get('Set-Cookie')))
    //   .then((data) => {
    //     logger.log(data);
    //   })
    //   .catch((error) => {
    //     console.error(error);
    //   });

    logger.log('Entered handleImageUpload()!!');
    const files = event.target.files;
    logger.log(files);
    var formData = new FormData();
    formData.append('file', files[0]);
    //formData.append('file', files[0]);
    formData.append('path', '');

    // logger.log(formData);

    logger.log('Formed the request HEADERS !!!');
    // logger.log(myHeaders);
    // // Display the key/value pairs
    // for (var pair of myHeaders.entries()) {
    //   logger.log(pair[0] + ', ' + pair[1]);
    // }
    logger.log('Calling upload here..!!!');
    fetch('https://www.mcgroce.com/hertzDrive-v1.0/api/upload', {
      method: 'POST',
      mode: 'no-cors',
      body: formData,
      redirect: 'follow',
    })
      .then((response) => response.json())
      .then((data) => {
        logger.log(data);
        logger.log('Image upload is successful..');
      })
      .catch((error) => {
        console.error(error);
      });
    logger.log('Exiting the method handleImageUpload()!!!');
  };

  uploadImage = (event) => {
    logger.log('Entered uploadImage() method!!');
    let files = event.target.files;
    if (files.length === 0) return;

    this.reset();

    let file = files[0];
    logger.log('Selected a new file !!');
    this.imageUrl = URL.createObjectURL(file);
    logger.log('The image url ->> ' + this.imageUrl);
    this.setState({
      responseStatus: 'progress',
      fileSrc: this.imageUrl,
      fileName: file.name,
      isUploadedFile: true,
      selectedImage: -1,
    });
    logger.log('The state values are set properly!!');
    logger.log('The FILE -> ' + file);
    let formData = new FormData();
    formData.set('file', file);
    formData.set('path', '');
    logger.log('The uploadUrl ->> ' + this.props.uploadUrl);
    logger.log('The formData ->> ' + formData);

    var requestOptions = {
      method: 'POST',
      mode: 'no-cors',
      body: formData,
      redirect: 'follow',
    };

    // fetch('https://www.mcgroce.com/hertzDrive-v1.0/api/upload', requestOptions)
    //   .then((response) => response.text())
    //   .then((result) => logger.log(result))
    //   .catch((error) => logger.log('error', error));

    // logger.log('Crossed fetch-1!!!!!!!');

    fetch(this.props.uploadUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: formData,
      signal: this.controller.signal,
    })
      .then(function (data) {
        logger.log('Request succeeded with JSON response', data);
        for (var pair of data.entries()) {
          logger.log(pair[0] + ', ' + pair[1]);
        }
      })
      .then((response) => alert(response.text()))
      .then((res) => (res.ok ? alert(res.json()) : Promise.reject(res)))
      .then((data) => {
        logger.log('The data ->' + data);
        if (this.mounted) {
          let result = data.result[0];
          result.prediction.forEach((p, index) => {
            if (index > 1) {
              p.ocr_text = p.ocr_text.replace(/./g, 'X');
            }
          });

          if (file.name.includes('.pdf')) {
            this.setState({
              fileSrc: `https://nanonets.imgix.net/${result.filepath}`,
            });
          }

          this.setState({
            responseStatus: 'success',
            fileName: result.input,
            boxes: result.prediction,
            output: {
              result: {
                predictions: result.prediction,
              },
            },
          });
        }
      })
      .catch((err) => {
        if (err.name == 'AbortError') return;
        console.error(err);
        if (this.mounted) {
          this.setState({
            responseStatus: 'error',
          });
        }
      });
  };

  setImageStatus = (status) => {
    this.setState({
      imageStatus: status,
    });
  };

  render() {
    const {classes} = this.props;
    let {
      fileSrc,
      fileName,
      responseStatus,
      imageStatus,
      demo,
      activeTab,
      activeIndex,
      open,
      tooltipMsg,
      output,
      output_type,
      boxes,
    } = this.state;

    output_type || (output_type = 'json');
    output || (output = {});
    output.result || (output.result = {});
    const _boxes = boxes || [];
    const images = demo.map((obj) => ({input: obj.input}));
    const currentObject = demo[activeIndex];

    return (
      <section>
        <div>
          <div className={classes.demoBox}>
            <div className={classes.col1}>
              <div style={{overflow: 'hidden', marginBottom: '15px'}}>
                <Thumbnails
                  images={images}
                  selectedImage={this.state.selectedImage}
                  onThumbnailClick={this.handleThumbnailClick}
                />
              </div>
              <Preview
                fileSrc={fileSrc}
                fileName={fileName}
                boxes={_boxes}
                setImageStatus={this.setImageStatus}
              />
              {this.props.upload && (
                <div style={{display: 'grid', marginTop: 15}}>
                  <label htmlFor="demo-input-image" className="btn blue">
                    {/* <AddIcon /> */}
                    <span style={{marginLeft: 10}}>
                      <FontAwesomeIcon
                        icon={faPlusCircle}
                        onMouseEnter={this.onOpen}
                        onMouseLeave={this.onClose}
                        classes={{root: classes.icon}}
                        onClick={this.copy}
                        size="lg"
                      />{' '}
                      Upload An Invoice
                    </span>
                  </label>
                  <input
                    type="file"
                    accept="image/*, application/pdf"
                    id="demo-input-image"
                    onClick={(event) => (event.target.value = '')}
                    onChange={this.postData}
                    style={{display: 'none'}}
                  />
                </div>
              )}
            </div>
            <div className={classes.col2}>
              {responseStatus === 'error' || imageStatus === 'error' ? (
                <div className={classes.boxWrapper}>
                  <p>An error occured while processing request.</p>
                </div>
              ) : responseStatus === 'progress' ||
                imageStatus === 'progress' ? (
                <div className={classes.boxWrapper}>
                  <Progress style={{color: '#fff'}} />
                </div>
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'grid',
                    gridTemplateRows: 'auto 1fr',
                  }}
                >
                  <div className={classes.outputHeader}>
                    <Tabs
                      value={activeTab}
                      onChange={this.handleTabChange}
                      variant="scrollable"
                      classes={{
                        root: classes.tabsRoot,
                        indicator: classes.indicator,
                      }}
                    >
                      {/* {currentObject && currentObject.demo_type === 'OCR' && (
                        <Tab
                          label="TABLE"
                          value="table"
                          disableRipple={true}
                          classes={{
                            root: classes.tabRoot,
                            selected: classes.tabSelected,
                          }}
                        />
                      )} */}
                      <Tab
                        label="JSON"
                        value="json"
                        disableRipple={true}
                        classes={{
                          root: classes.tabRoot,
                          selected: classes.tabSelected,
                        }}
                      />
                    </Tabs>

                    <div style={{display: 'flex'}}>
                      <Tooltip
                        open={open}
                        // onOpen={this.onOpen}
                        // onClose={this.onClose}
                        title={tooltipMsg}
                        placement="top"
                      >
                        <div
                          className={classes.iconWrapper}
                          style={{fontSize: 18}}
                        >
                          {/* <CopyIcon
                              fontSize="inherit"
                              onMouseEnter={this.onOpen}
                              onMouseLeave={this.onClose}
                              classes={{ root: classes.icon }}rror occured while load Image
                              onClick={this.copy}
                            /> */}
                          <FontAwesomeIcon
                            icon={faCopy}
                            onMouseEnter={this.onOpen}
                            onMouseLeave={this.onClose}
                            classes={{root: classes.icon}}
                            onClick={this.copy}
                            size="md"
                          />
                        </div>
                      </Tooltip>
                      <Tooltip title="Download Response" placement="top">
                        <div
                          className={classes.iconWrapper}
                          style={{fontSize: 22}}
                        >
                          {/* <GetAppIcon fontSize="inherit" classes={{ root: classes.icon }} onClick={this.download} /> */}
                          <FontAwesomeIcon
                            icon={faDownload}
                            classes={{root: classes.icon}}
                            onClick={this.download}
                            size="md"
                          />
                        </div>
                      </Tooltip>
                    </div>
                  </div>

                  <div style={{overflow: 'auto', padding: 15}}>
                    <div
                      style={{
                        overflow: 'auto',
                        height: '100%',
                        display: 'grid',
                        gridTemplateRows: 'minmax(0, max-content) min-content',
                      }}
                    >
                      <div
                        style={{
                          overflow: 'auto',
                          height: '100%',
                          background: '#fff',
                          borderRadius: 4,
                        }}
                      >
                        {/* {currentObject &&
                          currentObject.demo_type === 'OCR' &&
                          activeTab === 'table' && (
                            <div className={classes.form}>
                              {_boxes.map((obj, index) => (
                                <div key={index} className={classes.fieldBox}>
                                  <div className={classes.field}>
                                    <span className={classes.label}>
                                      {obj.label}
                                    </span>
                                    <span className={classes.value}>
                                      <span
                                        style={{
                                          filter:
                                            index > 1 &&
                                            this.state.isUploadedFile
                                              ? 'blur(4px)'
                                              : '',
                                        }}
                                      >
                                        {obj.ocr_text}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )} */}
                        {activeTab === 'json' && (
                          <>
                            {output_type.includes('json') && (
                              <div className={classes.jsonBox}>
                                {JSON.stringify(output.result, null, '  ')}
                              </div>
                            )}
                            {output_type.includes('image') &&
                              output.image.map((item) => (
                                <img
                                  key={item.url}
                                  data-src={item.url}
                                  className={`lazyload ${classes.responseImage}`}
                                  alt=""
                                />
                              ))}
                          </>
                        )}
                      </div>
                      {this.state.isUploadedFile && (
                        <div style={{marginTop: 20}}>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              borderRadius: 4,
                              background: '#fff',
                              boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.14)',
                            }}
                          >
                            <p
                              style={{
                                fontSize: 18,
                                fontWeight: 'bold',
                                margin: 20,
                                color: '#546fff',
                                flex: 1,
                              }}
                            >
                              Want to see all fields extracted?
                            </p>
                            <a
                              href="/contactUs"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn blue"
                              style={{margin: 20, minWidth: 200}}
                            >
                              <span>Get Started</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }
}

Demo.defaultProps = {
  demo: [],
};

export default withStyles(styles)(Demo);
