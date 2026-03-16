/* eslint-disable */
import React, {useState, useEffect} from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import './Pupit.css';
import AppContext from './AppContext';
import {v4 as uuidv4} from 'uuid';
import {VIDEO_GEN_URL} from '../config/apiBase';
import {logger} from '../utils/logger';

const PupitCard = ({image, title, video, audio}) => {
  const [showVideo, setShowVideo] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMesssage, setErrorMessage] = useState('');
  const [inputData, setInputData] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputDisable, setInputDisable] = useState(false);
  const [showSubmitButton, setShowSubmitButton] = useState(true);
  const [requestId, setRequestId] = useState(uuidv4());

  const [isPupidDroid, setIsPupitDroid] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIsPupitDroid(userAgent.includes('PupitDroid' || 'hevolvedroid'));
  }, []);
  const handleClick = () => {
    setIsModalOpen(true);
  };
  const handleReset = () => {
    setInputData('');
    setLoading(false); // Set loading to false
    setVideoUrl('');
    setInputDisable(false);
    setShowSubmitButton(true); // Re-enable the Submit button
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setInputData('');
    setLoading(false);
    setVideoUrl('');
  };

  const handleFormSubmit = (event) => {
    if (inputData.length < 10) {
      setErrorMessage('Please Enter atleast 10 Character!');
      return;
    }
    var raw = {
      uid: requestId,
      image_url: image,
      audio_sample_url: audio,
      text: inputData,
      gender: 'male',
      vtoonify: 'false',
      remove_bg: 'true',
      gradient: 'false',
      cus_bg: 'false',
      solid_color: 'false',
      inpainting: 'false',
      im_crop: 'true',
      hd_video: 'false',
    };
    setLoading(true);

    // logger.log(raw);
    event.preventDefault();
    image = image.replace('http:', 'https:');
    audio = audio.replace('http:', 'https:');
    let url = `${VIDEO_GEN_URL}?image_url=${image}&text=${inputData}&audio_url=${audio}`;
    fetch(url, {method: 'POST'})
      .then((response) => response.json())
      .then((data) => {
        let res = JSON.stringify(data);
        logger.log(res);
        setVideoUrl(data.video_url); // Set videoUrl from the response
        setLoading(false);
        setShowSubmitButton(false);
        setInputData('');
        setInputDisable(true);
      })
      .catch((error) => {
        logger.log(error);
        setLoading(false);
        setErrorMessage('Internal error occurred. Please try again later.');
      });
  };
  logger.log(videoUrl);

  const handleInputChange = (event) => {
    setInputData(event.target.value);
    setErrorMessage('');
  };

  const handleDownloadClick = () => {
    window.open(videoUrl, '_blank');
  };

  return (
    <div className="card">
      <div className="card-thumbnail">
        <img src={image} alt={title} />
        <i
          className="fa fa-play-circle play-icon"
          onClick={() => setShowVideo(true)}
        />
      </div>
      <h3 className="card-title">{title}</h3>
      {showVideo && (
        <div className="video-modal">
          <video className="videoTag" src={video} controls />
          <button
            className="close-button"
            onClick={() => setShowVideo(!showVideo)}
          >
            X
          </button>
        </div>
      )}

      <AppContext.Provider value={{isPupidDroid}}>
        {!isPupidDroid ? (
          <div>
            <button className="createButton" onClick={handleClick}>
              Create Your Video
            </button>
            {isModalOpen && (
              <div className="modal">
                <div className="modal-content">
                  <button className="closeButtonModal" onClick={handleClose}>
                    X
                  </button>
                  <input
                    disabled={inputDisable}
                    type="text"
                    value={inputData}
                    onChange={handleInputChange}
                    placeholder="Enter text here"
                    className="inputmodal"
                  />
                  <p style={{color: 'red'}}>{errorMesssage}</p>
                  {showSubmitButton && (
                    <button onClick={handleFormSubmit} className="submitButton">
                      Submit
                    </button>
                  )}

                  {errorMesssage ? (
                    <div style={{margin: '4px'}} className="error">
                      {errorMesssage}
                    </div>
                  ) : (
                    ''
                  )}
                  {videoUrl ? (
                    <>
                      <div className="download_reset">
                        <button
                          className="downLoad"
                          onClick={handleDownloadClick}
                        >
                          Download Video
                        </button>
                        <button
                          className=" reset downLoad"
                          onClick={handleReset}
                        >
                          Reset
                        </button>
                      </div>
                    </>
                  ) : (
                    loading && (
                      <div className="animation">
                        <CircularProgress size={24} sx={{color: '#6C63FF', mr: 1}} />
                      <span>Creating the Video....</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          ''
        )}
      </AppContext.Provider>
    </div>
  );
};
export default PupitCard;
