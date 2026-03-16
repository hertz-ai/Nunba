/* eslint-disable */
import AppContext from './AppContext';
import Spacer from './Spacer';

import FooterLight from '../pages/Layouts/footer-light';
import HeaderNano from '../pages/Layouts/header';
import {logger} from '../utils/logger';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import React, {useState, useEffect} from 'react';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import StarIcon from '@mui/icons-material/StarBorder';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Container from '@mui/material/Container';
import {AiOutlineClose} from 'react-icons/ai';
import {FiCheckCircle} from 'react-icons/fi';
import {useNavigate} from 'react-router-dom';
import {mailerApi} from '../services/socialApi';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import {styled} from '@mui/material/styles';
import sha256 from 'crypto-js/sha256';
import {useLocation} from 'react-router-dom';
import {addMultipleEventListeners} from 'reactstrap/lib/utils';
import {v4 as uuidv4} from 'uuid';
// color button styles - starts
import {withStyles} from '@mui/material/styles';
import {purple} from '@mui/material/colors';
import {json} from 'd3';
import {da} from 'date-fns/locale';

// color button styles - ends

function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="https://material-ui.com/">
        Your Website
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const sxStyles = {
  heroContent: {
    padding: '64px 0px 48px',
  },
  cardHeader: {
    backgroundColor: 'grey.200',
  },
  cardPricing: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: '16px',
  },
};

const ColorButton = withStyles((theme) => ({
  root: {
    background: 'linear-gradient(to right, #00e89d, #0078ff)',
    // color: theme.palette.getContrastText(purple[500]),
    // color: "linear-gradient(to right, #00e89d, #0078ff)",
    // backgroundColor: purple[500],
    // '&:hover': {
    //   backgroundColor: purple[700],
    // },
  },
}))(Button);

export default function Plan() {
  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [hevolvedroid, setIshevolvedroid] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);

  const [planId, setPlanId] = useState(null);
  const [planMessage, setPlanMessage] = useState(null);

  const handleClickClose = () => {
    setMessage(false);
  };
  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIshevolvedroid(userAgent.includes('speechtherapy'));
  }, []);

  useEffect(() => {
    logger.log('Chatbot Details Updated:', planId, planMessage);
  }, [planId, planMessage]);

  useEffect(() => {
    try {
      const userDetails = window.Handy?.getPlanDetails();
      if (!userDetails) throw new Error('No user details found');
      logger.log('Raw userDetails:', userDetails);
      const userJson = JSON.parse(userDetails);
      logger.log(userJson, 'this is the userJson');

      // Set plan_id and plan_message in separate states
      setPlanId(userJson.plan_ID || null);
      setPlanMessage(userJson.plan_message || null);
    } catch (error) {
      console.error('Error fetching or parsing user details:', error);
    }
  }, []);

  logger.log(planId, planMessage, 'this is the chatbot');

  const userData = location.state && location.state.userData;
  const student = (userData && userData.num_of_students) ?? '';

  // const signup = (event) => {

  //     event.preventDefault();
  //     navigate('/register/client');
  // };

  useEffect(() => {
    const getSubscriptionsByPlans = async () => {
      try {
        // mailerApi auto-unwraps response.data
        const data = await mailerApi.getPlans();
        logger.log('data', data);
        logger.log('chatbotplandetails', planId);
        logger.log('Type of chatbotDetails.plan_id:', typeof planId);
        logger.log(planMessage, 'this is the chatbot details');

        const filteredPlans = data.filter(
          (subscription) => subscription.plan_id === planId
        );
        logger.log(filteredPlans, 'this is the filter');

        if (hevolvedroid) {
          const additionalPlan = data.find(
            (subscription) => subscription.price === 699
          );
          setSubscriptionData(additionalPlan ? [additionalPlan] : []);
        }
        setSubscriptionData(filteredPlans);
      } catch (error) {
        console.error('Error fetching subscriptions:', error.message);
      }
    };

    getSubscriptionsByPlans();
  }, [hevolvedroid, planId, planMessage]);

  const handleClick = (subscription) => {
    setSelectedPlan(subscription);
    makePayment(subscription);
  };

  const makePayment = async (subscription) => {
    const uuid = uuidv4();
    const truncatedUuid = uuid.replace(/-/g, '').substring(0, 36);
    const transactionid = 'T' + truncatedUuid;
    setTransactionId(transactionid);

    let userData = {};

    // Always fetch user details
    try {
      const userDetails = window.Handy.getUserDetails();
      const userJson = JSON.parse(userDetails);
      userData = userJson;

      // Set transaction ID if the user is from HevolveDroid
      if (hevolvedroid) {
        const myVariable = {
          TRANSACTION_ID: transactionid,
        };
        const jsTransaction = JSON.stringify(myVariable);
        window.Handy.setTransactionId(jsTransaction);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      return; // Early exit if user details cannot be fetched
    }

    const postData = {
      phone_number: userData.phone_number,
      plan_id: subscription.plan_id,
      transaction_id: transactionid,
    };

    // Send subscription data to the first endpoint
    try {
      await mailerApi.addSubscription(postData);
    } catch (error) {
      console.error('Error sending subscription data:', error);
      return; // Early exit if the subscription data fails
    }

    const Total_Amount = userData.num_of_students
      ? subscription?.price * userData.num_of_students
      : subscription?.price;

    const payload = {
      mobile_number: userData.phone_number,
      plan_id: subscription.plan_id,
      transaction_id: transactionid,
      amount: Total_Amount,
    };

    // Send payment data to the second endpoint
    try {
      // mailerApi auto-unwraps response.data
      const redirect = await mailerApi.makePayment(payload);
      window.location.href = redirect;
    } catch (error) {
      console.error('Error during payment process:', error);
    }
  };

  const BootstrapDialog = styled(Dialog)(({theme}) => ({
    '& .MuiDialogContent-root': {
      padding: theme.spacing(2),
    },
    '& .MuiDialogActions-root': {
      padding: theme.spacing(1),
    },
  }));

  // logger.log("these is the student",student)

  // logger.log("this is the api plan",subsc)

  return (
    <React.Fragment>
      <AppContext.Provider value={{hevolvedroid}}>
        <style jsx="true">
          {`
            .navbar-nav a:hover {
              color: #13ce67;
            }
          `}
        </style>
        {/* Hero unit */}
        <Container maxWidth="sm" component="main" sx={sxStyles.heroContent}>
          <Typography
            component="h1"
            variant="h2"
            align="center"
            color="textPrimary"
            gutterBottom
          >
            {planMessage}
          </Typography>

          <BootstrapDialog
            onClose={handleClickClose}
            aria-labelledby="customized-dialog-title"
            open={message}
          >
            <DialogTitle sx={{m: 0, p: 2}}>
              Thank you for Registering!
            </DialogTitle>
            <DialogContent dividers>
              <Typography gutterBottom>
                Welcome to Hevolve, Thankyou for being a part of us, Our
                Executive will contact you shortly.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button autoFocus onClick={handleClickClose}>
                Close
              </Button>
            </DialogActions>
          </BootstrapDialog>
        </Container>
        {/* End hero unit */}
        {/* {!hevolvedroid ? */}

        <Container id="1" maxWidth="md" component="main">
          <Grid container spacing={5} alignItems="flex-end">
            {subscriptionData?.map((subscription) => (
              // Enterprise card is full width at sm breakpoint
              <Grid
                item
                key={subscription.title}
                xs={12}
                sm={subscription.title === 'Enterprise' ? 12 : 6}
                md={4}
              >
                <Card style={{display: 'flex', flexDirection: 'column'}}>
                  <CardHeader
                    title={subscription.title}
                    subheader={subscription.description}
                    titleTypographyProps={{align: 'center'}}
                    subheaderTypographyProps={{align: 'center'}}
                    action={subscription.title === 'Pro' ? <StarIcon /> : null}
                    sx={sxStyles.cardHeader}
                  />
                  <CardContent style={{flex: 1}}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{display: 'flex', alignItems: 'baseline'}}>
                        <Typography
                          component="h2"
                          variant="h3"
                          color="textPrimary"
                        >
                          {/* <del>${tier.price}</del> */}
                          <>{subscription.price}</>
                        </Typography>
                        <Typography variant="h6" color="textSecondary">
                          ₹/mo
                        </Typography>
                      </div>
                    </div>

                    <ul>
                      <li className="font-semibold text-slate-900 dark:text-white text-sm uppercase">
                        Features:
                      </li>

                      {/* Display only 6 to 8 features initially */}
                      {subscription?.features
                        ?.slice(0, 8)
                        .map((feature, index) => (
                          <li key={index} className="flex items-center mt-2">
                            {feature.access ? (
                              <FiCheckCircle
                                style={{color: 'green'}}
                                className="text-green-600 h-[18px] w-[18px] me-2"
                              />
                            ) : (
                              <AiOutlineClose
                                style={{color: 'red'}}
                                className="text-red-600 h-[18px] w-[18px] me-2"
                              />
                            )}
                            <Typography
                              component="span"
                              variant="subtitle1"
                              style={{marginLeft: '4px'}}
                              className={`text-slate-900 ${
                                feature.access
                                  ? 'dark:text-white'
                                  : 'dark:text-white'
                              } me-1 font-semibold`}
                            >
                              {feature.name}
                            </Typography>
                            {feature.daily && (
                              <Typography
                                component="span"
                                style={{marginLeft: '4px'}}
                                variant="subtitle1"
                                className="text-slate-400 me-1 font-semibold"
                              >
                                Daily: {feature.daily}
                              </Typography>
                            )}
                            {feature.monthly && (
                              <Typography
                                component="span"
                                variant="subtitle1"
                                className="text-slate-400 me-1 font-semibold"
                              >
                                Monthly: {feature.monthly}
                              </Typography>
                            )}
                          </li>
                        ))}

                      {/* Show remaining features in a scrollable container */}
                      {subscription?.features?.length > 8 && (
                        <div
                          style={{
                            maxHeight: '150px',
                            overflowY: 'auto',
                            paddingTop: '10px',
                          }}
                        >
                          {subscription?.features
                            ?.slice(8)
                            .map((feature, index) => (
                              <li
                                key={index}
                                className="flex items-center mt-2"
                              >
                                {feature.access ? (
                                  <FiCheckCircle
                                    style={{color: 'green'}}
                                    className="text-green-600 h-[18px] w-[18px] me-2"
                                  />
                                ) : (
                                  <AiOutlineClose
                                    style={{color: 'red'}}
                                    className="text-red-600 h-[18px] w-[18px] me-2"
                                  />
                                )}
                                <Typography
                                  component="span"
                                  variant="subtitle1"
                                  style={{marginLeft: '4px'}}
                                  className={`text-slate-900 ${
                                    feature.access
                                      ? 'dark:text-white'
                                      : 'dark:text-white'
                                  } me-1 font-semibold`}
                                >
                                  {feature.name}
                                </Typography>
                                {feature.daily && (
                                  <Typography
                                    component="span"
                                    style={{marginLeft: '4px'}}
                                    variant="subtitle1"
                                    className="text-slate-400 me-1 font-semibold"
                                  >
                                    Daily: {feature.daily}
                                  </Typography>
                                )}
                                {feature.monthly && (
                                  <Typography
                                    component="span"
                                    variant="subtitle1"
                                    className="text-slate-400 me-1 font-semibold"
                                  >
                                    Monthly: {feature.monthly}
                                  </Typography>
                                )}
                              </li>
                            ))}
                        </div>
                      )}
                    </ul>
                  </CardContent>

                  {student && subscription ? (
                    <Typography
                      style={{textAlign: 'center'}}
                      component="h2"
                      variant="h6"
                      color="textPrimary"
                    >
                      Total Price: {student} * {subscription.price} ={' '}
                      {student * subscription?.price}₹
                    </Typography>
                  ) : (
                    <Typography
                      style={{textAlign: 'center'}}
                      component="h2"
                      variant="h6"
                      color="textPrimary"
                    >
                      Total Price: {subscription.price}₹
                    </Typography>
                  )}

                  <CardActions style={{marginTop: 'auto'}}>
                    {subscription.price === 0 ? (
                      <ColorButton
                        fullWidth
                        onClick={(event) => handleClick(subscription)}
                      >
                        Register For Free
                      </ColorButton>
                    ) : (
                      <ColorButton
                        fullWidth
                        onClick={(event) => handleClick(subscription)}
                      >
                        Pay Now
                      </ColorButton>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>

        <Spacer h={120} />
      </AppContext.Provider>
    </React.Fragment>
  );
}
