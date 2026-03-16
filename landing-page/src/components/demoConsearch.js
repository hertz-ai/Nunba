/* eslint-disable */
import React from 'react';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import {styled} from '@mui/material/styles';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import {green, purple} from '@mui/material/colors';
import Button from '@mui/material/Button';
import {logger} from '../utils/logger';

const styles = {
  root: {
    flexGrow: 1,
    '& .MuiTextField-root': {
      margin: '8px',
      width: '100%',
    },
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  button: {
    marginTop: '24px',
    marginLeft: '8px',
  },
  paper: {
    marginTop: '24px',
    marginBottom: '24px',
    padding: '16px',
    '@media (min-width:648px)': {
      marginTop: '48px',
      marginBottom: '48px',
      padding: '24px',
    },
    textAlign: 'center',
    color: 'text.secondary',
  },
};

const GreenRadio = styled(Radio)({
  '&.Mui-checked': {
    color: '#f800a4',
  },
});

const ColorButton = styled(Button)(({theme}) => ({
  color: theme.palette.getContrastText(purple[500]),
  background: 'linear-gradient(to right, #f800a4, #0078ff)',
  '&:hover': {
    color: '#fff',
  },
  '&:focus': {
    outline: 'none',
  },
  marginTop: '160px',
  marginLeft: '8px',
  marginRight: '80px',
  '@media(max-width: 768px)': {
    marginLeft: '8px',
    marginRight: '8px',
    marginTop: '8px',
  },
}));

export default function DemoConsearch() {
  const [value, setValue] = React.useState('comprehension1');

  const handleDemoChange = (event) => {
    //alert("Selected :: " + event.target.value);
    setValue(event.target.value);
  };
  function routeToContactUs() {
    //document.querySelector("#mySidenav > li:nth-child(8) > a").click();
    // document
    //   .querySelector(
    //     '#root > div > header > div.navbar-wrapper.navbar-fixed > div > div > div.navbar-nav-wrapper > ul > li:nth-child(10) > a'
    //   )
    //   .click();
    alert('Queried :: ' + value);
  }

  // Example POST method implementation:
  function postData() {
    logger.log('Entered postData()');

    var url =
      'https://cors-anywhere.herokuapp.com/' +
      'http://wrapper.mcgroce.com/coreference?';
    var data = {
      document:
        'The legal pressures facing Michael Cohen are growing in a wide-ranging investigation of his personal business affairs and his work on behalf of his former client, President Trump. In addition to his work for Mr. Trump, he pursued his own business interests, including ventures in real estate, personal loans and investments in taxi medallions.',
    };

    var formData = new FormData();
    formData.append(
      'folderPath',
      '/home/sathish/gitRepos/HertzDrive/freshMount/SharedDrive'
    );
    // formData.append('fileName', 'Sample_Invoice_Template_by_PayPal.jpg');
    formData.append('triggerType', 'cortext');
    formData.append('publayFlag', 'false');
    formData.append('tesseractFlag', 'false');

    // Default options are marked with *
    // 'Content-Type': 'application/json',
    fetch(
      url +
        new URLSearchParams({
          document:
            'The legal pressures facing Michael Cohen are growing in a wide-ranging investigation of his personal business affairs and his work on behalf of his former client, President Trump. In addition to his work for Mr. Trump, he pursued his own business interests, including ventures in real estate, personal loans and investments in taxi medallions.',
        }),
      {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
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
        // body: formData, // body data type must match "Content-Type" header
      }
    )
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
          logger.log('Completed setting state!!');
          logger.log(data);
        });
      })
      .catch(function (err) {
        logger.log('Fetch Error :-S', err);
        document.getElementById('responseText').value =
          'search failed, please try again..';
      });
  }

  return (
    <React.Fragment>
      <Container>
        <Paper sx={styles.paper}>
          <Box sx={styles.root}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={3}>
                <FormControl component="fieldset">
                  {/* <FormLabel component="legend">Demo Type</FormLabel> */}
                  <Typography component="h1" variant="h5" align="center">
                    Demo type
                  </Typography>
                  <RadioGroup
                    aria-label="gender"
                    name="gender1"
                    value={value}
                    onChange={handleDemoChange}
                  >
                    <FormControlLabel
                      value="comprehension1"
                      control={<GreenRadio />}
                      label="Comprehension M1"
                    />
                    <FormControlLabel
                      value="comprehension2"
                      control={<GreenRadio />}
                      label="Comprehension M2"
                    />
                    <FormControlLabel
                      value="boolqa"
                      control={<GreenRadio />}
                      label="Yes or No QA"
                    />
                    <FormControlLabel
                      value="tapas"
                      control={<GreenRadio />}
                      label="Table Parsing"
                    />
                    <FormControlLabel
                      value="coreference"
                      control={<GreenRadio />}
                      label="Coreference"
                    />
                    <FormControlLabel
                      value="entailment"
                      control={<GreenRadio />}
                      label="Entailment"
                    />
                    <FormControlLabel
                      value="event2mind"
                      control={<GreenRadio />}
                      label="Event2Mind"
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={5}>
                <Typography component="h1" variant="h5" align="center">
                  Inputs
                </Typography>

                {value == 'comprehension1' && (
                  <>
                    <TextField
                      id="CM1UrlList"
                      label="URL"
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                    <TextField
                      id="outlined-textarea"
                      label="CM1Question"
                      placeholder="Placeholder"
                      multiline
                      variant="outlined"
                    />
                  </>
                )}

                {(value == 'comprehension2' || value == 'boolqa') && (
                  <>
                    <TextField
                      id="CM2Passage"
                      label="Passage"
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                    <TextField
                      id="CM2Question"
                      label="Question"
                      placeholder="Placeholder"
                      multiline
                      variant="outlined"
                    />
                  </>
                )}

                {value == 'coreference' && (
                  <>
                    <TextField
                      id="CorefDocText"
                      label="Document text"
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                  </>
                )}

                {value == 'entailment' && (
                  <>
                    <TextField
                      id="hypothesis"
                      label="Hypothesis"
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                    <TextField
                      id="premise"
                      label="Premise"
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                  </>
                )}

                {value == 'event2mind' && (
                  <>
                    <TextField
                      id="event2mindSource"
                      label="Enter Source"
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                  </>
                )}
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography component="h1" variant="h5" align="center">
                  Output
                </Typography>

                <TextField
                  id="responseText"
                  label="Response"
                  multiline
                  rows={4}
                  variant="outlined"
                  disabled={true}
                />

                <Box sx={styles.buttons}>
                  <ColorButton
                    variant="contained"
                    color="primary"
                    onClick={postData}
                  >
                    Submit
                  </ColorButton>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </React.Fragment>
  );
}
