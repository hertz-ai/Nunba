/* eslint-disable */
import React, {useState} from 'react';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Form from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Paper from '@mui/material/Paper';
import {withStyles, useTheme} from '@mui/material/styles';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import {green, purple} from '@mui/material/colors';
import Button from '@mui/material/Button';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
// get our fontawesome imports
import {faUserPlus, faSearch} from '@fortawesome/free-solid-svg-icons';
// import {faUserPlus, faSearch} from '@fortawesome/fontawesome-free';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import DynamicElementHandler from './DynamicElementHandler';
import {logger} from '../utils/logger';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Input from '@mui/material/Input';
import Snackbar from '@mui/material/Snackbar';
import {SnackbarContent} from '@mui/material';
import Spacer from './Spacer';
import logo_dark from './../images/logo-dark.png';
import FormHelperText from '@mui/material/FormHelperText';
import {QuestionAnswer} from '@mui/icons-material';
import Hidden from '@mui/material/Hidden';
import Controls from './controls/Controls';
import {useForm} from './useForm';
import {LocalizationProvider} from '@mui/x-date-pickers/LocalizationProvider';
import {DatePicker} from '@mui/x-date-pickers/DatePicker';
import {AdapterDateFns} from '@mui/x-date-pickers/AdapterDateFns';
import {useNavigate} from 'react-router-dom';
import Header from './TeacherLanding/Header';
import './TeacherLanding/TeacherHome.css';
import {mailerApi} from '../services/socialApi';

const sxStyles = {
  root: {
    flexGrow: 1,
    '& .MuiTextField-root': {
      margin: '8px',
      width: '100%',
    },
  },
  paper: {
    marginTop: '64px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    margin: '8px',
  },
  formControl: {
    margin: '8px',
    minWidth: 120,
    maxWidth: 300,
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

function BasicDatePicker() {
  const [selectedDate, handleDateChange] = useState(new Date());

  return (
    // <KeyboardDatePicker
    //   disableToolbar
    //   variant="inline"
    //   inputVariant="outlined"
    //   margin="normal"
    //   format="MMM/dd/yyyy"
    //   id="Schedule Date"
    //   label="Schedule Date"
    //   name="schedule_date"
    //   value={values.schedule_date}
    //   onChange={handleInputChange}
    // />
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        label="Basic example"
        value={selectedDate}
        onChange={handleDateChange}
      />
    </LocalizationProvider>
  );
}

const initialFValues = {
  schedule_date: new Date(),
};
//####
export default function ReviewAssessment() {
  const navigate = useNavigate();
  const [schedule_date, setSchedule_date] = React.useState(
    new Date('2014-08-18T21:11:54')
  );
  const validate = (fieldValues = values) => {
    let temp = {...errors};
    if ('schedule_date' in fieldValues)
      temp.schedule_date = fieldValues.schedule_date
        ? ''
        : 'This field is required.';
    setErrors({
      ...temp,
    });

    if (fieldValues == values) return Object.values(temp).every((x) => x == '');
  };
  const {values, setValues, errors, setErrors, handleInputChange, resetForm} =
    useForm(initialFValues, true, validate);
  const [value, setValue] = React.useState('comprehension1');
  const [errorMessage, setErrorMessage] = React.useState('');

  const [assessments_list, setassessments_list] = React.useState([
    {
      assessment_id: 1,
      assessment_type: 'GG',
      course_id: '222',
      is_active: true,
      name: 'assessement_1',
      number_of_questions: 20,
    },
  ]);
  const [quesAndAnsList, setQuesAndAnsList] = React.useState([]);
  // const [quesAndAnsList, setQuesAndAnsList] = React.useState([
  //   {
  //     id: 1,
  //     question: 'sample question?',
  //     question_type: 'NA',
  //     answer: 'sample answer',
  //     assessment_id: '2',
  //     is_active: true,
  //   },
  // ]);
  const [assessment_name, setAssessment_name] = React.useState('');
  // const MenuItem = ({text, selected}) => {
  //   return (
  //     <div>
  //       <div className="menu-item">{text}</div>
  //     </div>
  //   );
  // };

  React.useEffect(() => {
    let access_token = localStorage.getItem('hevolve_access_token');

    //TODO - verify the access token
    // if (access_token != null) {
    //   if (access_token.trim().length == 0) {
    //     navigate('/signin');
    //   }
    // }else{
    //   navigate('/signin');
    // }

    //TODO - endpoints in config file
    mailerApi
      .allAssessments({limit: 100})
      .then((data) => setassessments_list(data));
  }, []);

  const [courses, setCourseList] = React.useState([
    {name: '', is_active: true},
  ]);
  const [batches, setBatchList] = React.useState([{name: '', is_active: true}]);
  const [courseBatchBooks, setCourseBatchBookList] = React.useState({
    data: [
      {
        book_name: '',
        course_name: '',
        batch_name: '',
        is_active: true,
      },
    ],
  });
  const [APIs, setAPIList] = React.useState({name: '', is_active: true});
  const [apiNames, setAPINames] = React.useState([]);
  const [apiNamesDict, setAPINamesDict] = React.useState([
    {name: '', is_active: true},
  ]);
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [openError, setOpenError] = React.useState(false);

  function handleClose(event, reason) {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    setOpenError(false);
  }

  const handleChange = (event) => {
    logger.log('handlecHange');
    //update the apis queue
    setAPINames(event.target.value);
    var tempAPIs = event.target.value;
    var tempAPIJson = {};
    var tempAPIJsonArray = [];
    for (var i = 0; i < tempAPIs.length; i++) {
      logger.log(tempAPIs[i]);
      tempAPIJson['name'] = tempAPIs[i];
      tempAPIJson['is_active'] = true;
      tempAPIJsonArray.push(tempAPIJson);
      tempAPIJson = {};
    }
    logger.log(' temp api json array.>!');
    logger.log(tempAPIJsonArray);
    setAPINamesDict(tempAPIJsonArray);
  };

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

  const fetchAllQAs = (event) => {
    logger.log('fetchallQA()');
    logger.log('Getting all qas for assessment - ' + event.target.value);
    setAssessment_name(event.target.value);
    //TODO
    mailerApi
      .get('/get_all_QAs_by_assessment_name', {
        params: {limit: 100, assessment_name: event.target.value},
      })
      .then((data) => {
        if (data.length == 0) {
          setErrorMessage(
            "No questions found for '" + event.target.value + "'"
          );
          setQuesAndAnsList([]);
          // hide the editable form
          document.getElementById('qaEditableForm').style.display = 'none';
        } else {
          // enable the editable form
          document.getElementById('qaEditableForm').style.display = 'block';
          setQuesAndAnsList([]);
          setQuesAndAnsList(data);
        }
      })
      .catch((error) => {
        setErrorMessage(error?.message || 'Failed to fetch QAs');
        console.error('There was an error!', error);
      });
  };

  const clearAccessToken = (event) => {
    event.preventDefault();
    localStorage.setItem('hevolve_access_token', '');
    navigate('/teacher/signin');
  };
  const deleterecord = (event, id) => {
    event.preventDefault();
    logger.log('entered delete record');
    mailerApi
      .deleteQA(id)
      .then((data) => {
        if (!data || (Array.isArray(data) && data.length == 0)) {
          setErrorMessage('update may not be successful');
        } else {
          logger.log('update is successful..');
          logger.log(data);
          let temp = [...quesAndAnsList];
          for (let i = 0; i < temp.length; i++) {
            if (temp[i]['id'] == id) {
              temp.splice(i, 1);
            }
          }
          setQuesAndAnsList([]);
          setQuesAndAnsList(temp);
        }
      })
      .catch((error) => {
        setErrorMessage(error?.message || 'Failed to delete record');
        console.error('There was an error!', error);
      });
  };
  const updateForm = (event) => {
    event.preventDefault();
    logger.log('updateForm() !');
    const formData = new FormData(event.target);
    logger.log(formData);
    var updatedQAList = [];
    var temp_dict = {};
    var count = 1;
    var temp_qid = 1;
    logger.log(formData.entries());
    for (let [key, value] of formData.entries()) {
      logger.log(key, value);
      logger.log('count -> ' + count);
      if (key == 'qa_id') {
        temp_qid = value;
      }
      if (key == 'assess_id') {
        //temp_dict['assessment_id'] = value;
        temp_dict['assessment_name'] = assessment_name;
      }
      if (key == 'ques_type') {
        temp_dict['question_type'] = value;
      }
      if (key == 'question') {
        temp_dict['question'] = value;
      }
      if (key == 'answer') {
        //temp_dict.hasOwnProperty('answer') &&
        temp_dict['answer'] = value;
        temp_dict['is_active'] = true;
        updatedQAList.push(temp_dict);
        // make a update call here
        updateDatabase(temp_qid, temp_dict);
        temp_dict = {};
      }
      count = count + 1;
    }
    alert('Updated the QA !');
    logger.log('The updated final object array - >');
    logger.log(updatedQAList);
    const reqBody = temp_dict;
  };

  const updateDatabase = (temp_qid, temp_dict) => {
    logger.log('updateDatabase()');
    logger.log('typeof(temp_qid) ->' + typeof temp_qid);
    logger.log(temp_qid);
    mailerApi
      .updateQA(temp_qid, temp_dict)
      .then((data) => {
        if (!data || (Array.isArray(data) && data.length == 0)) {
          setErrorMessage('update may not be successful');
        } else {
          logger.log('update is successful..');
          logger.log(data);
        }
      })
      .catch((error) => {
        setErrorMessage(error?.message || 'Failed to update');
        console.error('There was an error!', error);
      });
  };

  return (
    <React.Fragment>
      <Header isBlack={true} />

      <Container component="main" maxWidth="md">
        <Box sx={sxStyles.paper}>
          <div style={{paddingBottom: '20px', display: 'flex'}}>
            {/* <div> */}

            {/* <Typography component="h1" variant="h5">
                Review Assessment
            </Typography> */}
            <Typography component="h2" variant="h3" align={'center'}>
              Review Assessment
            </Typography>
            {/* <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar> */}
            <FontAwesomeIcon
              icon={faSearch}
              color="#0078ff"
              size="3x"
              style={sxStyles.avatar}
            ></FontAwesomeIcon>
          </div>

          {/* <form className={classes.form} onSubmit={updateDatabase}> */}
          <Form onSubmit={updateDatabase}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography component="h1" variant="h6">
                  Choose Assessment
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography component="h1" variant="h6">
                  Schedule On
                </Typography>

                {/* <Controls.DatePicker
                  name="schedule_date"
                  label="Schedule Date"
                  id="schedule_date"
                  value={values.schedule_date}
                  onChange={setSchedule_date}
                /> */}
                {/* <Controls.Input
                  label="Email"
                  id="schdule_date"
                  name="schdule_date"
                  value={values.schedule_date}
                  onChange={handleInputChange}
                /> */}
                {/* <BasicDatePicker /> */}
              </Grid>
              <Grid item xs={6}>
                <FormControl sx={sxStyles.formControl}>
                  <Select
                    labelId="demo-simple-select-placeholder-label-label"
                    id="demo-simple-select-placeholder-label"
                    value={assessment_name}
                    onChange={(event) => fetchAllQAs(event)}
                    displayEmpty
                    margin="dense"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {assessments_list.map((item) => (
                      <MenuItem value={item.name}>{item.name}</MenuItem>
                    ))}

                    {/* <MenuItem value={10}>Ten</MenuItem>
                    <MenuItem value={20}>Twenty</MenuItem>
                    <MenuItem value={30}>Thirty</MenuItem> */}
                  </Select>
                </FormControl>
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
          </Form>

          <form
            id="qaEditableForm"
            noValidate
            onSubmit={updateForm}
            style={{display: 'none'}}
          >
            {/* <div style={{paddingBottom: '20px', display: 'flex'}}> */}
            <Box sx={sxStyles.root}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography component="h1" variant="h6" align={'center'}>
                    Question and Answers
                  </Typography>
                </Grid>
                {quesAndAnsList.map((item) => (
                  <>
                    <Grid item xs={12}>
                      {/* <Typography component="h3" variant="h6" name="qa_id">
                        ID : {item.id}
                      </Typography> */}
                      {/* <Hidden xsDown smDown mdDown lgDown xlDown> */}

                      <TextField
                        label="id"
                        name="qa_id"
                        defaultValue={item.id}
                        style={{display: 'none'}}
                      ></TextField>
                      <TextField
                        label="id"
                        name="assess_id"
                        defaultValue={item.assessment_id}
                        style={{display: 'none'}}
                      ></TextField>
                      <TextField
                        label="id"
                        name="ques_type"
                        defaultValue={item.question_type}
                        style={{display: 'none'}}
                      ></TextField>
                      {/* </Hidden> */}
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        variant="outlined"
                        required
                        fullWidth
                        label="question"
                        name="question"
                        type="text"
                        color="primary"
                        defaultValue={item.question}
                      ></TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        variant="outlined"
                        required
                        fullWidth
                        label="options"
                        name="options"
                        type="text"
                        color="primary"
                        defaultValue={item.options}
                      ></TextField>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        variant="outlined"
                        fullWidth
                        multiline
                        rows={4}
                        label="answer"
                        name="answer"
                        type="text"
                        defaultValue={item.answer}
                      ></TextField>
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      <Button onClick={(event) => deleterecord(event, item.id)}>
                        <DeleteIcon color="error" />
                      </Button>
                    </Grid>
                    <br></br>
                    <br></br>
                  </>
                ))}
              </Grid>
              <ColorButton
                variant="contained"
                color="primary"
                type="submit"
                style={{marginLeft: '15%'}}
              >
                Submit
              </ColorButton>
            </Box>
          </form>
        </Box>
        <Box mt={5}>
          <Copyright />
        </Box>
      </Container>
    </React.Fragment>
  );
}
