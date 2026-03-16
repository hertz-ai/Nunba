/* eslint-disable */
import React, {useState} from 'react';
import {mailerApi} from '../services/socialApi';

const DeleteUserPage = () => {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserDeleted, setIsUserDeleted] = useState(false);

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
    setErrorMessage('');
  };

  const handleMobileChange = (event) => {
    setMobile(event.target.value);
    setErrorMessage('');
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    // Check if email and mobile number are provided
    if (!email && !mobile) {
      setErrorMessage('Please provide an email or mobile number.');
      return;
    }

    // Send OTP request to the server
    const data = {
      email_address: email,
      phone_number: mobile,
    };

    setIsSubmitting(true);

    try {
      await mailerApi.deleteUser(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      setErrorMessage('Invalid email or mobile number. Please try again.');
    }

    setIsSubmitting(false);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setOtp('');
  };

  const handleOtpChange = (event) => {
    setOtp(event.target.value);
    setErrorMessage('');
  };

  const handleOtpSubmit = async (event) => {
    event.preventDefault();

    // Check if OTP is provided
    if (!otp) {
      setErrorMessage('Please provide the OTP.');
      return;
    }

    // Verify the OTP
    const data = {
      email_address: email,
      phone_number: mobile,
      otp: otp,
    };

    setIsSubmitting(true);

    try {
      await mailerApi.confirmDeleteUser(data);
      // Handle successful user deletion
      setEmail('');
      setMobile('');
      setOtp('');
      setIsModalOpen(false);
      setIsUserDeleted(true);
    } catch (error) {
      console.error(error);
      setErrorMessage('Failed to verify OTP. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="container">
      <h1>User Deletion</h1>
      <form onSubmit={handleFormSubmit}>
        <div className="form-group">
          <label htmlFor="emailInput">Email:</label>
          <input
            type="email"
            id="emailInput"
            className="form-control"
            value={email}
            onChange={handleEmailChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="mobileInput">Mobile Number:</label>
          <input
            type="text"
            id="mobileInput"
            className="form-control"
            value={mobile}
            onChange={handleMobileChange}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Delete User
        </button>
      </form>

      {/* OTP Verification Modal */}
      {isModalOpen && (
        <div
          className="modal"
          tabIndex="-1"
          role="dialog"
          style={{display: 'block'}}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">OTP Verification</h5>
                <button
                  type="button"
                  className="close"
                  onClick={handleModalClose}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleOtpSubmit}>
                  <div className="form-group">
                    <label htmlFor="otpInput">OTP:</label>
                    <input
                      type="text"
                      id="otpInput"
                      className="form-control"
                      value={otp}
                      onChange={handleOtpChange}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Verify OTP
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleModalClose}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSubmitting && <p>Loading...</p>}
      {errorMessage && <p className="text-danger">{errorMessage}</p>}
      {isUserDeleted && (
        <p className="text-success">User deleted successfully!</p>
      )}
    </div>
  );
};

export default DeleteUserPage;
