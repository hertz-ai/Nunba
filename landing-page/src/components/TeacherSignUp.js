/* eslint-disable */
import logo_dark from './../images/logo-dark.png';
import Spacer from './Spacer';
import {faUser} from '@fortawesome/free-solid-svg-icons';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import {Backdrop} from '@mui/material/';
import CircularProgress from '@mui/material/CircularProgress';
import Radio from '@mui/material/Radio';
import React from 'react';
import RadioGroup from '@mui/material/RadioGroup';
import InputAdornment from '@mui/material/InputAdornment';
import FormLabel from '@mui/material/FormLabel';
import Paper from '@mui/material/Paper';
import {withStyles, useTheme} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import {Autocomplete} from '@mui/lab';
import Select from '@mui/material/Select';
import {green, purple} from '@mui/material/colors';
import Toolbar from '@mui/material/Toolbar';
import MuiPhoneNumber from 'material-ui-phone-number';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
// get our fontawesome imports
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import Snackbar from '@mui/material/Snackbar';
import {SnackbarContent} from '@mui/material';
import {logger} from '../utils/logger';

// auth
// import {AuthContext} from '../App';
import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

// TODO - uninstall this package
// import { useForm } from 'react-hook-form';
import {useForm, Form} from './useForm';
import Controls from './controls/Controls';

// import Alert from '@mui/material/Alert';
import Alert from '@mui/lab/Alert';

import {mailerApi} from '../services/socialApi';

const sxStyles = {
  paper: {
    marginTop: '24px',
    marginBottom: '24px',
    padding: '16px',
    '@media (min-width:648px)': {
      marginTop: '96px',
      marginBottom: '48px',
      padding: '24px',
    },
    textAlign: 'center',
    color: 'text.secondary',
  },
  avatar: {
    margin: '8px',
  },
  appBar: {
    position: 'relative',
  },
};

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.palette.getContrastText(purple[500]),
    // color: "linear-gradient(to right, #00e89d, #0078ff)",
    background: 'linear-gradient(to right, #00e89d, #0078ff)',
    // backgroundColor: purple[500],
    '&:hover': {
      backgroundColor: purple[700],
    },
    '&:focus': {
      outline: 'none',
    },
  },
}))(Button);

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

const GreenRadio = withStyles({
  root: {
    '&$checked': {
      // color: green[600],
      color: '#f800a4',
    },
  },
  checked: {},
})((props) => <Radio color="default" {...props} />);

const names = [
  'AI Assessment',
  'AI Conversation For Improving English',
  'AI Interview',
  'AI Revision',
];

function getStyles(name, personName, theme) {
  return {
    fontWeight:
      personName.indexOf(name) === -1
        ? theme.typography.fontWeightRegular
        : theme.typography.fontWeightMedium,
  };
}

const initialFValues = {
  id: 0,
  fullName: '',
  email: '',
  mobile: '',
  city: '',
  gender: 'male',
  departmentId: '',
  hireDate: new Date(),
  isPermanent: false,
};
// function TeacherLogin(props) {
export default function TeacherSignUp(props) {
  const [isLoggedIn, setLoggedIn] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const [userName, setUserName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [hevolvedroid, setIshevolvedroid] = useState(true);

  // https://stackoverflow.com/questions/43230194/how-to-use-redirect-in-the-new-react-router-dom-of-reactjs
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [openError, setOpenError] = React.useState(false);
  const [alert, setAlert] = useState(false);
  const [alertContent, setAlertContent] = useState('');

  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIshevolvedroid(userAgent.includes('hevolvedroid'));
  }, []);
  const postLogin = (event) => {
    // function postLogin() {
    event.preventDefault();
    logger.log('Entered postLogin()');
    setLoading(!loading);
    // call the db access app to verify user is valid
    mailerApi
      .verifyTeacher({
        phone_number: document.getElementById('phoneNumber').value,
        email_address: document.getElementById('email').value,
      })
      .then((result) => {
        // mailerApi auto-unwraps response.data
        if (result === true) {
          setLoading(false);
          logger.log('teacher found ');
          setAlertContent('Teacher already exists !!');
          setAlert(true);
          setLoggedIn(true);
        } else {
          logger.log('teacher not found ');
          // register the teacher here
          if (sub.length == 0) {
            setAlertContent('subject cannot be empty');
            setAlert(true);
            setLoading(false);
            return;
          }
          if (stan.length == 0) {
            setAlertContent('standard cannot be empty');
            setAlert(true);
            setLoading(false);
            return;
          }
          const teacherRegObj = {
            name: document.getElementById('name').value,
            address: document.getElementById('address').value,
            email_address: document.getElementById('email').value,
            phone_number: document.getElementById('phoneNumber').value,
            client_secret: clientSecret,
            haveclient: haveClient,
            is_active: true,
            subject: sub,
            standard: stan,
            client_id: cli,
          };
          logger.log(teacherRegObj);
          mailerApi
            .registerTeacher(teacherRegObj)
            .then((data) => {
              setLoading(false);
              logger.log('created entry for teacher!!');
              setAlertContent('Signed up successfully');
              setAlert(true);
              navigate('/plan', {
                state: {
                  client_id: 1,
                },
              });
            })
            .catch((error) => {
              setLoading(false);
              logger.log(
                'Exception while creating entry for teacher!!' +
                  (error.message || error)
              );
              setAlertContent(
                error?.detail || error?.message || 'Registration failed'
              );
              setAlert(true);
              setIsError(true);
            });
        }
      })
      .catch((e) => {
        setLoading(false);
        setIsError(true);
      });

    // var url = 'http://localhost:3000/teacher/login';
    // axios
    //   .post(url, {
    //     userName,
    //     password,
    //   })
    //   .then((result) => {
    //     if (result.status === 200) {
    //       setAuthTokens(result.data);
    //       setLoggedIn(true);
    //     } else {
    //       setIsError(true);
    //     }
    //   })
    //   .catch((e) => {
    //     setIsError(true);
    //   });
  };

  // const handleLoginSubmit_issue = (event) => {
  //   event.preventDefault();
  //   alert('handleLoginSubmit()');

  //   var myHeaders = new Headers();
  //   myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

  //   var urlencoded = new URLSearchParams();
  //   urlencoded.append('client_id', 'pe9cIH18BLCRMXcnpY2pPbaGpdWautlt');
  //   urlencoded.append('client_secret', '2KCbbah9FhFhl9a6zeVYNhEBagpFkHYh');
  //   urlencoded.append('grant_type', 'client_credentials');

  //   var requestOptions = {
  //     method: 'POST',
  //     headers: myHeaders,
  //     body: urlencoded,
  //     redirect: 'follow',
  //   };
  //   setData({
  //     ...data,
  //     email: '',
  //     client_id: null,
  //     client_secret: null,
  //     errorMessage: null,
  //   });

  //   var url =
  //     'https://cors-anywhere.herokuapp.com/' +
  //     'https://service.mcgroce.com/login/oauth2/token';
  //   //TODO
  //   url = 'http://localhost:3000/login/teacher';
  //   fetch(url, requestOptions)
  //     .then((res) => {
  //       if (res.ok) {
  //         return res.json();
  //       }
  //       throw res;
  //     })
  //     .then((resJson) => {
  //       logger.log('calling LOGIN dispatch!!');
  //       logger.log(resJson);
  //       dispatch({
  //         type: 'LOGIN',
  //         payload: resJson,
  //       });
  //     })
  //     .catch((error) => {
  //       logger.log('catch block!!');
  //       var dt = {user: 'GI', token: 'random_token', isAuthenticated: true};
  //       logger.log('The state values before dispatch !!');
  //       logger.log(state);
  //       dispatch({
  //         type: 'LOGIN',
  //         payload: dt,
  //       });
  //       logger.log('dt -> ' + dt);
  //       logger.log(dt);
  //       setData({
  //         ...data,
  //         isSubmitting: false,
  //         errorMessage: error.message || error.statusText,
  //       });
  //     });
  //   // .then((result) => logger.log('The access token -> ' + result))
  //   // .catch((error) => logger.log('error', error));
  // };

  const getAccessToken = (event) => {
    event.preventDefault();
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');

    const urlencoded = new URLSearchParams();
    urlencoded.append('client_id', 'pe9cIH18BLCRMXcnpY2pPbaGpdWautlt');
    urlencoded.append('client_secret', '2KCbbah9FhFhl9a6zeVYNhEBagpFkHYh');
    urlencoded.append('grant_type', 'client_credentials');

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: urlencoded,
      redirect: 'follow',
    };
    const url =
      'https://cors-anywhere.herokuapp.com/' +
      'https://service.mcgroce.com/login/oauth2/token';
    fetch(url, requestOptions)
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
          logger.log('Completed setting state!!');
        });
      })
      .catch(function (err) {
        logger.log('Fetch Error :-S', err);
      })
      .catch((error) => console.error('Token fetch error:', error));
  };

  function handleClose(event, reason) {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    setOpenError(false);
  }
  const handleClientChange = (newValue) => {
    logger.log('Entered handleClientChange()');
    for (let i = 0; i < client.length; i++) {
      if (client[i].name == newValue) {
        setCli(client[i].client_id);
        {
          break;
        }
      }
    }
  };
  const handleSubjectChange = (newValue) => {
    const temp = [];
    for (let i = 0; i < newValue.length; i++) {
      temp.push(newValue[i].toLowerCase());
    }
    setSub(temp);
  };

  const handleChange = (newValue) => {
    setPhoneNumber(newValue);
  };
  function ValidateEmail(mail) {
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) {
      setEmailError(false);
    } else {
      setEmailError(true);
    }
  }
  const [emailError, setEmailError] = useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [isValid, setIsValid] = React.useState(false);
  const [clientSecret, setClientSecret] = useState('123');
  const [haveClient, setHaveClient] = useState('No');
  const [subject, setSubject] = useState([]);
  const [standard, setStandard] = useState([]);
  const [client, setClient] = useState([]);
  const [sub, setSub] = useState([]);
  const [stan, setStan] = useState([]);
  const [cli, setCli] = useState(0);
  const fetchSubject = async () => {
    mailerApi
      .getSubjects()
      .then((data) => {
        // mailerApi auto-unwraps response.data
        setSubject(data);
      })
      .catch((error) => {
        logger.log(error);
        setAlertContent('unable to fetch subjects, please try again');
        setAlert(true);
      });
  };
  const fetchStandard = async () => {
    mailerApi
      .getStandards()
      .then((data) => {
        // mailerApi auto-unwraps response.data
        setStandard(data);
      })
      .catch((error) => {
        logger.log(error);
        setAlertContent('unable to fetch Standard, please try again');
        setAlert(true);
      });
  };
  const fetchClient = async () => {
    mailerApi
      .allClients()
      .then((data) => {
        // mailerApi auto-unwraps response.data
        setClient(data);
      })
      .catch((error) => {
        logger.log(error);
        setAlertContent('unable to fetch Client, please try again');
        setAlert(true);
      });
  };
  useEffect(() => {
    fetchSubject();
    fetchStandard();
    fetchClient();
  }, []);

  return (
    <React.Fragment>
      {!hevolvedroid && (
        <AppBar position="absolute" color="default" sx={sxStyles.appBar}>
          <Toolbar>
            <a className="navbar-brand" href="/register/client">
              <img
                src={logo_dark}
                alt="Hertz ai"
                className="logo-dark"
                height="14"
              />
            </a>
          </Toolbar>
        </AppBar>
      )}
      <Container component="main" maxWidth="md">
        <Box sx={sxStyles.paper}>
          <div style={{paddingBottom: '20px', alignContent: 'center'}}>
            <Typography component="h1" variant="h5">
              Sign up
            </Typography>
            {/* <Avatar className={classes.avatar}>
            <LockOutlinedIcon />
            </Avatar> */}
            <FontAwesomeIcon
              icon={faUser}
              color="#0078ff"
              size="lg"
              style={sxStyles.avatar}
            ></FontAwesomeIcon>
          </div>
          <Backdrop sx={{color: '#fff', zIndex: 9}} open={loading}>
            <CircularProgress color="inherit" />
          </Backdrop>
          <form onSubmit={postLogin}>
            {/* <form className={classes.form} onSubmit={postLogin}> */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  variant="outlined"
                  required
                  fullWidth
                  id="name"
                  label="Name"
                  name="name"
                  autoComplete="name"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  variant="outlined"
                  required
                  fullWidth
                  id="email"
                  onBlur={(e) => ValidateEmail(e.target.value)}
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                />
                {emailError ? (
                  <span style={{color: 'red'}}>Enter a valid Email</span>
                ) : null}
              </Grid>

              <Grid item xs={12} sm={6}>
                <MuiPhoneNumber
                  name="phoneNumber"
                  defaultCountry={'in'}
                  onlyCountries={['in', 'es']}
                  variant="outlined"
                  fullWidth
                  required
                  id="phoneNumber"
                  label="Phone Number"
                  value={phoneNumber}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="address"
                  variant="outlined"
                  required
                  fullWidth
                  id="address"
                  label="Address"
                  autoComplete="address"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  id="subject"
                  options={subject.map((option) => option.name)}
                  freeSolo
                  required
                  onChange={(event, newValue) => handleSubjectChange(newValue)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({index})}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Subjects"
                      placeholder="Subjects you teach"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  id="standard"
                  options={standard.map((option) => option.standard)}
                  freeSolo
                  onChange={(event, newValue) => {
                    setStan(newValue);
                  }}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({index})}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Standard"
                      placeholder="Standard"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormLabel id="demo-row-radio-buttons-group-label">
                  Do you have a Client?
                </FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="demo-row-radio-buttons-group-label"
                  name="row-radio-buttons-group"
                  value={haveClient}
                  onChange={(event) => setHaveClient(event.target.value)}
                >
                  <FormControlLabel
                    value="Yes"
                    control={<Radio color="default" />}
                    label="Yes"
                  />
                  <FormControlLabel
                    value="No"
                    control={<Radio color="default" />}
                    label="No"
                  />
                </RadioGroup>
              </Grid>
              <Grid item xs={12} sm={6}></Grid>
              {haveClient == 'Yes' ? (
                <>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      id="client_name"
                      disableClearable
                      options={client.map((option) => option.name)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          name="cllient_name"
                          id="client_name"
                          variant="outlined"
                          label="Select a Institute"
                        />
                      )}
                      onChange={(event, newValue) =>
                        handleClientChange(newValue)
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      variant="outlined"
                      fullWidth
                      id="client_secret"
                      label="Client Secret Code"
                      onChange={(event) => setClientSecret(event.target.value)}
                      name="client_secret"
                      autoComplete="client_secret"
                    />
                  </Grid>
                </>
              ) : (
                <></>
              )}
              {/* <pre>
                  parent courses list :: {JSON.stringify(courses, null, 2)}
                </pre>
                <pre>
                  parent batches list :: {JSON.stringify(batches, null, 2)}
                </pre>
                <pre>parent APIs list :: {JSON.stringify(APIs, null, 2)}</pre> */}
            </Grid>
            <Spacer h={40} />
            <ColorButton variant="contained" color="primary" type="submit">
              Sign Up
            </ColorButton>

            {alert ? <Alert severity="error">{alertContent}</Alert> : <></>}
            <Snackbar
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              open={open}
              autoHideDuration={2000}
              onClose={handleClose}
            >
              <SnackbarContent
                contentprops={{
                  'aria-describedby': 'message-id',
                }}
                // prettier-ignore
                message={(
                      `Thanks for registering with HertzAI`
                      )}
              />
            </Snackbar>
            <Snackbar
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              open={openError}
              autoHideDuration={2000}
              onClose={handleClose}
            >
              <SnackbarContent
                contentprops={{
                  'aria-describedby': 'message-id',
                }}
                // prettier-ignore
                message={(
                      `Looks like there was a problem, please try again !`
                      )}
              />
            </Snackbar>
          </form>
        </Box>
        <Box mt={5}>
          <Copyright />
        </Box>
      </Container>
    </React.Fragment>
  );
}
// export default TeacherLogin;
