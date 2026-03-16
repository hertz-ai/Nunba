/* eslint-disable */
import React, {useState, useEffect} from 'react';
import Avatar from '@mui/material/Avatar';
// import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import {styled} from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import {useNavigate} from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import {SEND_EMAIL_URL} from '../config/apiBase';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import {logger} from '../utils/logger';

//color button styles - starts
import {withStyles} from '@mui/material/styles';
import {purple} from '@mui/material/colors';
import Button from '@mui/material/Button';
//color button styles - ends

import HeaderNano from '../pages/Layouts/header';
import Spacer from './Spacer';
// import Album from './Album';
import FooterLight from '../pages/Layouts/footer-light';
import Snackbar from '@mui/material/Snackbar';
import {SnackbarContent} from '@mui/material';

const urlParams = new URLSearchParams(window.location.search);
function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="https://material-ui.com/">
        HertzAI
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}
const BootstrapDialog = styled(Dialog)(({theme}) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
}));
const sxStyles = {
  root: {
    height: '100vh',
  },
  image: {
    backgroundImage:
      'url(https://marvelapp.com/static/illustration@2x-85cce263ddf60035c6702cc57dd1fc2a-ae7ab.jpg)',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'grey.50',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  paper: {
    margin: '64px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'start',
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: '8px',
  },
  submit: {
    margin: '24px 0px 16px',
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
  },
}))(Button);

//export default function SignInSide() {

const SignInSide = () => {
  const navigate = useNavigate();
  const [value, setValue] = React.useState('');
  const handleChange = (event) => {
    setValue(event.target.value);
  };
  const preventDefault = (event) => event.preventDefault();
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState(false);
  const [isInstitution, setIsInstitution] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Check if the 'institution' parameter is present
    setIsInstitution(urlParams.has('institution'));
  }, []);
  function sendUserInfo_old(event) {
    event.preventDefault();
    logger.log('Posting Email to hertz API...');
    var userName = document.getElementById('userName').value;
    var email = document.getElementById('email').value;
    var phoneNumber = document.getElementById('phoneNumber').value;
    var company = document.getElementById('company').value;
    var question = document.getElementById('question').value;
    var userDetails = {
      userName: userName,
      email: email,
      phoneNumber: phoneNumber,
      company: company,
      question: question,
    };
    logger.log('Sending User details ->> ' + JSON.stringify(userDetails));
    fetch(SEND_EMAIL_URL, {
      method: 'post',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userDetails),
    })
      .then((response) => response.json())
      .then((data) => {
        logger.log('Success:', data);
        //toggleModal();
        setOpen(true);
        alert('Thanks for submission!');
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }

  function sendUserInfo(event) {
    event.preventDefault();
    logger.log('Posting Email to hertz API...');
    var userName = document.getElementById('userName').value;
    var email = document.getElementById('email').value;
    var phoneNumber = document.getElementById('phoneNumber').value;
    var company = document.getElementById('company').value;
    var question = document.getElementById('question').value;
    var userDetails = {
      userName: userName,
      email: email,
      phoneNumber: phoneNumber,
      company: company,
      question: question,
    };
    logger.log('Sending User details ->> ' + JSON.stringify(userDetails));
    fetch(SEND_EMAIL_URL, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userDetails),
    })
      .then((response) => response.json())
      .then((data) => {
        logger.log('Success:', data);
        //   handleClose();
        setMessage(!message);
        setOpen(true);
        // setSnackPack((prev) => [...prev, { 'Thanks for submission !', key: new Date().getTime() }]);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }
  const handleClickClose = () => {
    setMessage(false);
    window.location.reload(false);
  };

  function handleClose(event, reason) {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  }

  return (
    <React.Fragment>
      <HeaderNano fixed={true} />
      <Grid container component="main" sx={sxStyles.root}>
        {/* <CssBaseline /> */}

        <Grid item xs={12} sm={8} md={5} elevation={6} square="true">
          <Box sx={sxStyles.paper}>
            {isInstitution ? (
              <Typography component="h3" variant="h3">
                Book a Demo
              </Typography>
            ) : (
              <Typography component="h3" variant="h3">
                Drop us a line ..
              </Typography>
            )}
            <Box component="form" sx={sxStyles.form} onSubmit={sendUserInfo}>
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="userName"
                label="Your Name"
                name="userName"
                autoFocus
              />
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
              />
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                name="phoneNumber"
                label="phoneNumber"
                type="number"
                id="phoneNumber"
              />
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="company"
                label="Company"
                name="company"
                autoFocus
              />
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="question"
                label={isInstitution ? "I'd like to book a demo." : 'Message'}
                name="message"
                autoFocus
                multiline={true}
              />
              <ColorButton
                variant="contained"
                color="primary"
                sx={sxStyles.submit}
                type="submit"
              >
                Submit
              </ColorButton>
              <BootstrapDialog
                onClose={handleClickClose}
                aria-labelledby="customized-dialog-title"
                open={message}
              >
                <DialogTitle sx={{m: 0, p: 2}}>
                  Thank you for contacting us!
                </DialogTitle>
                <DialogContent dividers>
                  <Typography gutterBottom>We’ve got your message.</Typography>
                  <Typography gutterBottom>
                    the response will be sent to the email address you’ve
                    indicated within 2 business days. If it’s urgent, we
                    encourage you to call us at +91 90030 54371 Have a wonderful
                    day!
                  </Typography>
                </DialogContent>
                <DialogActions>
                  <Button autoFocus onClick={handleClickClose}>
                    Close
                  </Button>
                </DialogActions>
              </BootstrapDialog>
              <Box mt={5}>
                <Copyright />
              </Box>
            </Box>
          </Box>
        </Grid>
        <Grid item xs="auto" sm={4} md={7} sx={sxStyles.image} />
      </Grid>
      <Spacer h={120} />

      <Grid container>
        <Grid item xs={12} sm={6} md={6} elevation={6} square="true">
          <Box sx={sxStyles.paper}>
            <Typography component="h3" variant="h4">
              Who do you need to get in touch with?
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={6} elevation={6} square="true">
          <Box sx={sxStyles.paper}>
            <Typography component="h3" variant="h4">
              Support
            </Typography>
            <Typography paragraph={true} variant="body1">
              We have a support portal that has the answers to dozens of the
              most common questions about HertzAi --
              <Link href="#" onClick={preventDefault}>
                Check it out here.
              </Link>
            </Typography>

            <Typography component="h3" variant="h4">
              Sales
            </Typography>
            <Typography paragraph={true} variant="body1">
              Interested in learning more about HertzAI? Contact our product
              experts at --
              <Link href="#" onClick={preventDefault}>
                sales@hertzai.com
              </Link>
            </Typography>

            <Typography component="h3" variant="h4" align="left">
              Business Development
            </Typography>
            <Typography paragraph={true} variant="body1">
              Are you a reseller, affiliate, or association that would like to
              partner with HertzAI? Get connected with our Partner team at --
              <Link href="#" onClick={preventDefault}>
                partners@hertzai.com
              </Link>
            </Typography>

            <Typography component="h3" variant="h4">
              General Questions
            </Typography>
            <Typography paragraph={true} variant="body1">
              Have a general question for us? Contact us at --
              <Link href="#" onClick={preventDefault}>
                info@hertzai.com
              </Link>
            </Typography>
          </Box>
        </Grid>
      </Grid>
      <Grid container>
        <Grid item xs={12} sm={6} md={6} elevation={6} square="true">
          <Box sx={sxStyles.paper}>
            <Typography component="h3" variant="h4">
              --- OUR OFFICE
            </Typography>
            <Typography paragraph={true} variant="h5">
              HertzAI,Gokulapuram, near maraimalainagar
              <br />
              No. 180, arihant Villa vivianna, 6th street
              <br />
              Chennai 603204
              <br />
              TamilNadu
              <br />
              India
              <br />
              T: 9003054371
              <br />
              E: sales@hertzai.com
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={6} elevation={6} square="true">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3891.2829362165253!2d80.03949471404135!3d12.760128722937544!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5267ade2cbe485%3A0xa8ece3f814049c6c!2sHertzAI!5e0!3m2!1sen!2sin!4v1660728243564!5m2!1sen!2sin"
            width="600"
            height="450"
            style={{border: 0}}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </Grid>
      </Grid>
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
                      `Thanks for submission, we will get back to you !`
                      )}
        />
      </Snackbar>

      <FooterLight />
    </React.Fragment>
  );
};

export default SignInSide;
