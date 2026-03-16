/* eslint-disable */
import React, {useEffect} from 'react';
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
import {logger} from '../utils/logger';
import {ThemeProvider} from '@mui/material/styles';
import {authTheme, ColorButton} from '../theme/authTheme';
import {faUser} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
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
  email: '',
  phoneNumber: '',
  client_id: '',
  client_secret: '',
};

//####
export default function SignIn() {
  const navigate = useNavigate();

  useEffect(() => {
    let access_token = localStorage.getItem('hevolve_access_token');
    if (access_token != null) {
      if (access_token.trim().length != 0) {
        navigate('/reviewQA');
      }
    }
  }, []);

  //Form validation!!
  //===========================================================
  const validate = (fieldValues = values) => {
    logger.log('fieldValues !!');
    logger.log(fieldValues);
    let temp = {...errors};
    if ('client_id' in fieldValues)
      temp.client_id = fieldValues.client_id ? '' : 'Client ID is required.';
    if ('client_secret' in fieldValues)
      temp.client_secret = fieldValues.client_secret
        ? ''
        : 'Client Secret is required.';
    if ('email' in fieldValues)
      temp.email = /$^|.+@.+..+/.test(fieldValues.email)
        ? ''
        : 'Email is not valid';
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
    logger.log('Entered postLogin()');
    if (validate()) {
      logger.log('validation successful..');
    } else {
      return false;
    }
    //call the db access app to verify user is valid
    mailerApi
      .verifyTeacher({
        phone_number: document.getElementById('phoneNumber').value,
        email_address: document.getElementById('email').value,
      })
      .then((result) => {
        // mailerApi auto-unwraps response.data
        if (result === true) {
          logger.log(
            'Teacher found in database, now calling kong api to get the access_token..'
          );
          //TODO - remove the below
          localStorage.setItem('hevolve_access_token', 'dummy_token');
          navigate('/reviewQA');
        } else {
          logger.log(
            'Teacher is not identified, and not getting the access token..'
          );
          throw new Error('teacher is not identified');
        }
      })
      .catch((e) => {
        logger.log('Exception -> ' + e);
        return false;
      });

    resetForm();
  };

  const getAccessToken = () => {
    var myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

    var urlencoded = new URLSearchParams();
    // urlencoded.append('client_id', 'pe9cIH18BLCRMXcnpY2pPbaGpdWautlt');
    // urlencoded.append('client_secret', '2KCbbah9FhFhl9a6zeVYNhEBagpFkHYh');
    // urlencoded.append('grant_type', 'client_credentials');

    urlencoded.append('client_id', document.getElementById('client_id').value);
    urlencoded.append(
      'client_secret',
      document.getElementById('client_secret').value
    );
    urlencoded.append('grant_type', 'client_credentials');

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
      redirect: 'follow',
    };
    var url =
      'https://cors-anywhere.herokuapp.com/' +
      'https://service.mcgroce.com/assess/oauth2/token';
    // 'https://service.mcgroce.com/login/oauth2/token';
    fetch(url, requestOptions)
      .then((response) => {
        if (response.status !== 200) {
          logger.log(
            'Looks like there was a problem. Status Code: ' + response.status
          );
          //TODO - uncomment
          //return;
        }
        // Examine the text in the response
        response.json().then((data) => {
          logger.log(data);
          setAccessToken(data['access_token']);
          //set the access token in localstorage
          localStorage.setItem('hevolve_access_token', data['access_token']);
          navigate('/reviewQA');
        });
      })
      .catch(function (err) {
        logger.log('Fetch Error :-S', err);
      })
      .catch((error) => console.error('Token fetch error:', error));

    //TODO - remove the below
    localStorage.setItem('hevolve_access_token', 'dummy_token');
    navigate('/reviewQA');
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
            Sign in
          </Typography>
          <Box component="form" sx={sxStyles.form} onSubmit={postLogin}>
            {/* <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              onChange={handleInputChange}
              autoComplete="email"
              autoFocus
            /> */}
            <Controls.Input
              label="Email"
              id="email"
              name="email"
              fullWidth
              value={values.email}
              onChange={handleInputChange}
              error={errors.email}
            />
            {/* <TextField
              variant="outlined"
              margin="normal"
              autoComplete="client_id"
              name="client_id"
              required
              fullWidth
              onChange={handleInputChange}
              id="client_id"
              label="Client ID"
              autoFocus
            />
            <TextField
                  variant="outlined"
                  required
                  fullWidth
                  id="phoneNumber"
                  label="Phone Number"
                  name="phoneNumber"
                  autoComplete="phoneNumber"
                /> */}
            <Controls.Input
              name="phoneNumber"
              id="phoneNumber"
              label="Phone Number"
              value={values.phoneNumber}
              onChange={handleInputChange}
              error={errors.phoneNumber}
            />
            <Controls.Input
              name="client_id"
              id="client_id"
              label="Client ID"
              value={values.client_id}
              onChange={handleInputChange}
              error={errors.client_id}
            />

            <Controls.Input
              name="client_secret"
              id="client_secret"
              label="Client Secret"
              value={values.client_secret}
              onChange={handleInputChange}
              error={errors.client_secret}
            />

            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label="Remember me"
            />
            {/* <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            Sign In
          </Button> */}
            <ColorButton
              variant="contained"
              color="primary"
              fullWidth
              sx={sxStyles.submit}
              type="submit"
            >
              Sign In
            </ColorButton>
            <Grid container>
              <Grid item xs>
                <Link href="#" variant="body2">
                  Forgot password?
                </Link>
              </Grid>
              <Grid item>
                <Link href="#" variant="body2">
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
