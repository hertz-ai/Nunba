/* eslint-disable */
import React, {useEffect, useState} from 'react';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
// import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import {ThemeProvider} from '@mui/material/styles';
import {authTheme, ColorButton} from '../theme/authTheme';
import {faUser} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import Alert from '@mui/lab/Alert';
import {logger} from '../utils/logger';
//import MuiAlert from "@mui/lab/Alert";
//redirect
// Redirect removed (not available in React Router v6)

//import { useForm } from 'react-hook-form';
import {useForm, Form} from './useForm';
import Controls from './controls/Controls';
import {mailerApi} from '../services/socialApi';
import {useNavigate} from 'react-router-dom';

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="https://hertzai.com/">
        HertzAI
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const sxStyles = {
  paper: {
    marginTop: '64px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    margin: '8px',
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: '8px',
  },
  submit: {
    margin: '24px 0px 16px',
  },
};

const initialFValues = {
  phoneNumber: '',
  otp: '',
};

//####
export default function SignIn() {
  const navigate = useNavigate();

  const [otpView, setOtpView] = useState(true);
  const [alert, setAlert] = useState(false);
  const [alertContent, setAlertContent] = useState('');
  useEffect(() => {
    let access_token = localStorage.getItem('hevolve_access_token');
    let access_id = localStorage.getItem('hevolve_access_id');
    if (access_token != null && access_id != null) {
      if (access_token.trim().length != 0) {
        navigate('/teacher/home');
      }
    }
  }, []);

  //Form validation!!
  //===========================================================
  const validate = (fieldValues = values) => {
    logger.log('fieldValues !!');
    logger.log(fieldValues);
    let temp = {...errors};
    if ('phoneNumber' in fieldValues)
      temp.phoneNumber =
        fieldValues.phoneNumber.length > 9
          ? ''
          : 'Minimum 10 numbers required.';
    setErrors({
      ...temp,
    });

    if (fieldValues == values) return Object.values(temp).every((x) => x == '');
  };

  const {values, setValues, errors, setErrors, handleInputChange, resetForm} =
    useForm(initialFValues, true, validate);
  //===========================================================

  const [access_token, setAccessToken] = React.useState(
    localStorage.getItem('hevolve_access_token')
  );
  const postLogin = (event) => {
    //function postLogin() {
    event.preventDefault();

    //call the db access app to verify user is valid
    mailerApi
      .verifyOtp({
        phone_number: document.getElementById('phoneNumber').value,
        otp: document.getElementById('otp').value,
      })
      .then((result) => {
        // mailerApi auto-unwraps response.data
        logger.log('The response from verify teacher -> success');
        localStorage.setItem('hevolve_access_token', result.access_token);
        localStorage.setItem('hevolve_access_id', result.user_id);
        navigate('/teacher/home');
      })
      .catch((e) => {
        logger.log('Exception -> ' + e);
        setAlertContent('Invalid OTP');
        setAlert(true);
        return false;
      });

    resetForm();
  };

  const getotp = (event) => {
    event.preventDefault();
    logger.log('Entered getotp()');
    if (validate()) {
      logger.log('validation successful..');
    } else {
      return false;
    } //call the db access app to verify user is valid
    mailerApi
      .verifyTeacherByPhone({
        phone_number: document.getElementById('phoneNumber').value,
      })
      .then((result) => {
        // mailerApi auto-unwraps response.data
        if (result?.detail) {
          setAlertContent(result.detail);
          setAlert(true);
        } else {
          logger.log('Teacher found in database, verify otp');
          setOtpView(!otpView);
          setAlert(false);
        }
      })
      .catch((e) => {
        logger.log('Exception -> ' + e);
        return false;
      });
  };
  return (
    <ThemeProvider theme={authTheme}>
      <Container component="main" maxWidth="xs">
        <Box sx={sxStyles.paper}>
          {/* <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
          </Avatar> */}
          <FontAwesomeIcon
            icon={faUser}
            color="#0078ff"
            size="lg"
            style={sxStyles.avatar}
          ></FontAwesomeIcon>
          <Typography component="h1" variant="h5">
            User Sign in
          </Typography>
          {alert ? <Alert severity="error">{alertContent}</Alert> : <></>}
          <Box component="form" sx={sxStyles.form} onSubmit={postLogin}>
            <Controls.Input
              name="phoneNumber"
              id="phoneNumber"
              type="number"
              label="Phone Number"
              value={values.phoneNumber}
              onChange={handleInputChange}
              error={errors.phoneNumber}
            />
            {!otpView ? (
              <Controls.Input
                name="otp"
                id="otp"
                label="OTP"
                type="number"
                value={values.otp}
                onChange={handleInputChange}
                error={errors.otp}
              />
            ) : (
              <></>
            )}

            {/* <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            Sign In
          </Button> */}
            {otpView ? (
              <ColorButton
                variant="contained"
                color="primary"
                fullWidth
                onClick={getotp}
                type="button"
              >
                Get otp
              </ColorButton>
            ) : (
              <ColorButton
                variant="contained"
                color="primary"
                fullWidth
                sx={sxStyles.submit}
                type="submit"
              >
                Sign in
              </ColorButton>
            )}

            <Grid container>
              <Grid item>
                <Link href="/teacher/signup" variant="body2">
                  {"Don't have an account? Sign Up"}
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
        <Box mt={8}>
          <Copyright />
        </Box>
      </Container>
    </ThemeProvider>
  );
}

// function Alert(props) {
//   return <MuiAlert elevation={6} variant="filled" {...props} />;
// }
