import CheckoutSignIn from '../components/CheckoutSignIn';
import Footer from '../components/footer';
import Navbar from '../components/navbar';
import usePlanCheckout from '../hooks/usePlanCheckout';
import {
  FREE_TRIAL_NOTE,
  planIsFreeTrial,
  parsePositiveInt,
  seatsFor,
  seatsLabel,
  totalFor,
  fetchPlans,
} from '../services/planCheckout';
import {logger} from '../utils/logger';

import React, {useEffect, useLayoutEffect, useState} from 'react';
import ReactGA from 'react-ga';
import {AiOutlineClose} from 'react-icons/ai';
import {FiCheckCircle} from 'react-icons/fi';
import {Link, useLocation, useSearchParams} from 'react-router-dom';


export default function SpeechPricing() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hevolvedroid, setIshevolvedroid] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [numOfStudents, setNumOfStudents] = useState(null);
  const {DataForPricePage} = location.state || {};
  // No plan until the app or the link names one.  It used to default to 6, which
  // is Hevolve++ and not a speech plan at all, so a visit with no plan sold
  // Hevolve++ under a "Speech Therapy" heading.  Null first, on purpose: the
  // prerenderer-style first render has to match a visit with no plan.
  const [planId, setPlanId] = useState(null);
  const [planMessage, setPlanMessage] = useState(null);
  const {buy, busyPlanId, problem, signIn, closeSignIn} = usePlanCheckout({
    notifyApp: hevolvedroid,
  });

  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIshevolvedroid(userAgent.includes('speechtherapy'));
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  // A layout effect so a visitor who HAS a plan never sees the "no plan was
  // chosen" line flash before it is applied.
  useLayoutEffect(() => {
    // Inside the app, the app says which plan to show.  In a plain browser there
    // is no window.Handy, so a link says it: /speechtherapy?plan=<plan_id>.
    // With neither, no plan is chosen and the page says so.
    if (!window.Handy || typeof window.Handy.getPlanDetails !== 'function') {
      const requested = parsePositiveInt(searchParams.get('plan'));
      if (requested !== null) setPlanId(requested);
      return;
    }
    try {
      const userDetails = window.Handy.getPlanDetails();
      if (!userDetails) throw new Error('No user details found');
      logger.log('Raw userDetails:', userDetails);
      const userJson = JSON.parse(userDetails);
      logger.log(userJson, 'this is the userJson');

      // Set plan_id and plan_message in separate states
      setPlanId(parsePositiveInt(userJson.plan_ID));
      setPlanMessage(userJson.plan_message || null);
    } catch (error) {
      console.error('Error fetching or parsing user details:', error);
    }
  }, [searchParams]);

  useEffect(() => {
    logger.log('Chatbot Details Updated:', planId, planMessage);
  }, [planId, planMessage]);

  useEffect(() => {
    if (DataForPricePage && DataForPricePage.num_of_students) {
      setNumOfStudents(DataForPricePage.num_of_students);
    }
  }, [DataForPricePage]);

  useEffect(() => {
    // Nothing to look up until a plan is chosen.
    if (planId === null) return;
    const getSubscriptionsByPlans = async () => {
      try {
        // The speech plans are not on the public list: the account store returns
        // one only for ?plan_id=<id>.  The filter below stays, so a server that
        // ignores the parameter (and sends everything) still shows just this plan.
        const data = await fetchPlans(planId);
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

  // The whole checkout is usePlanCheckout: the bearer token and the phone come
  // from the signed-in session (or, inside the app, the app's own phone), the
  // subscription row is created first and the payment follows at the server's
  // own price.  It used to need window.Handy and gave up silently without it.
  const handlePayNowClick = (subscription) => {
    buy(subscription, {
      numStudents: seatsFor(subscription, numOfStudents),
      returnPath: `/speechtherapy?plan=${subscription.plan_id}`,
    });
  };

  ReactGA.event({
    category: 'Button',
    action: 'Click',
    label: 'Payment Page Click',
  });

  return (
    <>
      <CheckoutSignIn signIn={signIn} onClose={closeSignIn} />
      {!hevolvedroid && <Navbar />}
      <section style={{paddingTop: '4rem'}} className="relative mt-4">
        <div className="container relative">
          <div className="grid grid-cols-1 text-center">
            <div>
              <h5 className="md:text-4xl text-3xl md:leading-normal leading-normal tracking-wider font-semibold text-white mb-0">
                {planMessage || 'Speech Therapy'}
              </h5>
            </div>
            <ul className="tracking-[0.5px] mb-0 inline-block">
              <li className="inline-block capitalize text-[15px] font-medium duration-500 ease-in-out text-white/50 hover:text-white">
                <Link to="/">Hevolve AI</Link>
              </li>
              <li className="inline-block text-base text-white/50 mx-0.5">
                <i className="mdi mdi-chevron-right"></i>
              </li>
              <li className="inline-block capitalize text-[15px] font-medium duration-500 ease-in-out text-white">
                Pricing
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="relative md:pb-24 pb-16">
        <div className="container relative">
          {planId === null && (
            <p role="status" className="text-slate-400 text-center mt-6">
              No plan was chosen for this page. Open the link you were sent, or
              pick a plan on the{' '}
              <Link to="/Plan" className="text-white underline">
                pricing page
              </Link>
              .
            </p>
          )}
          {planId !== null &&
            subscriptionData &&
            subscriptionData.length === 0 && (
              <p role="status" className="text-slate-400 text-center mt-6">
                Plan {planId} is not available. Check the link you were sent,
                or pick a plan on the{' '}
                <Link to="/Plan" className="text-white underline">
                  pricing page
                </Link>
                .
              </p>
            )}
          <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 mt-6 gap-6">
            {subscriptionData &&
              subscriptionData.map((subscription) => (
                <div
                  key={subscription.plan_id}
                  style={{backgroundColor: '#1E1E1E'}}
                  className="relative overflow-hidden rounded-md shadow dark:shadow-gray-800"
                >
                  <div className="p-6">
                    <h5 className="text-2xl leading-normal font-semibold">
                      {subscription.title}
                    </h5>
                    <p className="text-slate-400 mt-2">
                      {subscription.description}
                    </p>
                    <div className="flex mt-4">
                      <span className="text-lg font-semibold">₹</span>
                      <span className="text-5xl font-semibold mb-0 ms-1">
                        {totalFor(
                          subscription,
                          seatsFor(subscription, numOfStudents)
                        )}
                      </span>
                    </div>
                    <p className="text-slate-400 uppercase text-xs">
                      {seatsLabel(seatsFor(subscription, numOfStudents))}
                    </p>
                    <div className="mt-6">
                      <button
                        disabled={busyPlanId !== null}
                        onClick={() => handlePayNowClick(subscription)}
                        style={{
                          background:
                            'linear-gradient(to right, #00e89d, #0078ff)',
                          borderColor: '#00f0c5',
                          color: '#FFFAE8',
                          transition: 'background-color 0.3s ease',
                        }}
                        className="btn-feedback py-2 px-5 inline-block font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-amber-400/5 hover:bg-amber-400 rounded border-amber-400/10 hover:border-amber-400 text-amber-400 hover:text-white"
                      >
                        {subscription.price === 0
                          ? 'Register For Free'
                          : 'Pay Now'}
                      </button>
                      {planIsFreeTrial(subscription) && (
                        <p className="text-slate-400 text-sm mt-3">
                          {FREE_TRIAL_NOTE}
                        </p>
                      )}
                      {problem && problem.planId === subscription.plan_id && (
                        <p role="alert" className="text-red-400 text-sm mt-3">
                          {problem.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-5 right-0 mr-4 mt-4">
                    <FiCheckCircle size={30} color="#00e89d" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
