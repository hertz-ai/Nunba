/* eslint-disable no-unused-vars, camelcase, import/order */
import logo_dark from './../images/logo-dark.png';
import Spacer from './Spacer';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import {green, purple} from '@mui/material/colors';
import Container from '@mui/material/Container';
import {withStyles, useTheme} from '@mui/material/styles';
import React, {useState, useEffect} from 'react';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';

// import {faUserPlus, faSearch} from '@fortawesome/fontawesome-free';

import {useNavigate} from 'react-router-dom';
import {Autocomplete} from '@mui/lab';
import {useLocation} from 'react-router-dom';
import Select, {components} from 'react-select';
import {RemoveRounded, AddRounded} from '@mui/icons-material';
import Alert from '@mui/lab/Alert';
import Header from './TeacherLanding/Header';
import './TeacherLanding/TeacherHome.css';
import {chatApi, mailerApi} from '../services/socialApi';
import {logger} from '../utils/logger';

const sxStyles = {
  paper: {
    marginTop: '64px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};

const ColorButton = withStyles((theme) => ({
  root: {
    width: '70%',
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

// ####
export default function Prompt() {
  const location = useLocation();
  const navigate = useNavigate();
  const [alert, setAlert] = useState(false);
  const [alertContent, setAlertContent] = useState('');
  const [severity, setSeverity] = useState('error');
  const [allprompts, setAllPrompts] = useState([]);
  const [userid, setUserid] = useState(0);

  const theme = useTheme();

  const ITEM_HEIGHT = 48;
  const ITEM_PADDING_TOP = 8;
  const MenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
    },
  };

  const handleAddFieldsNew = () => {
    const val = [...allprompts];
    val.push({
      name: '',
      prompt: '',
      is_active: true,
      user_id: userid,
    });
    setAllPrompts(val);
  };

  const handleSubmit = () => {
    const payload = {listprompts: allprompts};
    // Try mailerApi (cloud) — local backend syncs automatically
    mailerApi
      .createPromptList(payload)
      .then((data) => {
        logger.log(data);
        setAlertContent('Data updated Successfully');
        setAlert(true);
        setSeverity('info');
      })
      .catch((error) => {
        logger.log('error saving prompts', error);
        setAlertContent('Unable to update prompt, please try again');
        setAlert(true);
      });
  };

  const handleRemoveFieldsNew = (index) => {
    const val = [...allprompts];
    if (val.length == 1) {
      alert('At least one entry is needed!!');
    } else {
      val.splice(index, 1);
      setAllPrompts(val);
    }
  };

  const handleInputChange = (index, event) => {
    const values = [...allprompts];
    if (event.target.name == 'name') {
      values[index].name = event.target.value;
    }
    if (event.target.name == 'prompt') {
      values[index].prompt = event.target.value;
    }
    if (event.target.name == 'is_active') {
      values[index].is_active = event.target.checked;
    }
    setAllPrompts(values);
  };
  const fetchprompts = async () => {
    const accessUserID = localStorage.getItem('hevolve_access_id');

    const handleData = (data) => {
      setAllPrompts(data);
      if (data.length == 0) {
        setAllPrompts([
          {name: '', prompt: '', is_active: true, user_id: accessUserID},
        ]);
      }
    };

    // Local-first: try local Flask backend, fallback to cloud DB
    chatApi
      .getPrompts(accessUserID)
      .then((data) => handleData(data))
      .catch(() => {
        // Fallback to cloud
        mailerApi
          .getPromptsByUser(accessUserID)
          .then((data) => handleData(data))
          .catch((error) => {
            logger.log(error);
            setAlertContent('Unable to get prompt, please try again');
            setAlert(true);
            setAllPrompts([
              {name: '', prompt: '', is_active: true, user_id: accessUserID},
            ]);
          });
      });
  };
  useEffect(() => {
    const access_token = localStorage.getItem('hevolve_access_token');
    const access_user = localStorage.getItem('hevolve_access_id');
    // TODO - verify the access token
    if (access_token != null) {
      if (access_token.trim().length == 0) {
        navigate('/teacher/signin');
      }
      if (access_user != null) {
        setUserid(access_user);
      } else {
        navigate('/teacher/signin');
      }
    } else {
      navigate('/teacher/signin');
    }
    fetchprompts();
  }, [navigate]);
  return (
    <React.Fragment>
      <Header isBlack={true} />
      <Container component="main" maxWidth="md">
        <Box sx={sxStyles.paper}>
          <div style={{paddingBottom: '20px', display: 'flex'}}>
            <Typography component="h2" variant="h3" align={'center'}>
              Custom Prompt
            </Typography>
          </div>
        </Box>
        {alert ? <Alert severity={severity}>{alertContent}</Alert> : <></>}
        <Spacer h={40} />
        <div role="form" className="form-horizontal">
          <div className="form-row createBookresponsive">
            {allprompts.map((inputField, index) => (
              <React.Fragment key={`${inputField}~${index}`}>
                <Grid
                  container
                  spacing={2}
                  className="form-group  createBookresponsive col-md-12"
                  style={{marginBottom: '20px'}}
                >
                  <Grid item xs={2}>
                    <TextField
                      autoComplete="name"
                      className="form-control"
                      label="Name"
                      variant="standard"
                      id="standard-basic"
                      name="name"
                      required
                      style={{backgroundColor: '#fafafa'}}
                      value={inputField.name}
                      onChange={(event) => handleInputChange(index, event)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      autoComplete="name"
                      className="form-control"
                      label="Prompt"
                      variant="standard"
                      id="standard-basic"
                      required
                      style={{backgroundColor: '#fafafa'}}
                      name="prompt"
                      value={inputField.prompt}
                      onChange={(event) => handleInputChange(index, event)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <FormControlLabel
                      label="Active"
                      control={
                        <Checkbox
                          color="primary"
                          name="is_active"
                          checked={inputField.is_active}
                          onChange={(event) => handleInputChange(index, event)}
                        />
                      }
                    />
                  </Grid>
                  <AddRounded
                    fontSize="large"
                    onClick={() => handleAddFieldsNew()}
                    style={{cursor: 'pointer'}}
                    color="primary"
                  />
                  <RemoveRounded
                    fontSize="large"
                    onClick={() => handleRemoveFieldsNew(index)}
                    style={{cursor: 'pointer'}}
                    color="primary"
                  />
                </Grid>
              </React.Fragment>
            ))}
          </div>
          <Spacer h={40} />
          <ColorButton
            variant="contained"
            color="primary"
            type="submit"
            onClick={handleSubmit}
            style={{marginLeft: '15%'}}
          >
            Submit
          </ColorButton>
        </div>
      </Container>
      <Box mt={5}>
        <Copyright />
      </Box>
    </React.Fragment>
  );
}
