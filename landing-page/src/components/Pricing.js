import CheckoutSignIn from './CheckoutSignIn';

import usePlanCheckout from '../hooks/usePlanCheckout';
import {
  FREE_TRIAL_NOTE,
  planIsFreeTrial,
  parsePositiveInt,
  seatsFor,
  totalFor,
} from '../services/planCheckout';
import {mailerApi} from '../services/socialApi';
import {logger} from '../utils/logger';

import React, {useState, useEffect} from 'react';
import ReactGA from 'react-ga';
import {AiOutlineClose} from 'react-icons/ai';
import {FiCheckCircle} from 'react-icons/fi';
import {useLocation, useSearchParams} from 'react-router-dom';

export default function Pricing() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hevolvedroid, setIshevolvedroid] = useState(true);
  const {DataForPricePage} = location.state || {};
  const {buy, busyPlanId, problem, signIn, closeSignIn} = usePlanCheckout({
    notifyApp: hevolvedroid,
  });

  // /Plan?plan=<plan_id> preselects a plan, so an agent's link can name the one
  // it is selling.  The student count of a business plan comes from the sign-up
  // state, or from ?num_students= when the way back from sign-in (which loses
  // router state) has to carry it.
  const requestedPlanId = parsePositiveInt(searchParams.get('plan'));
  const stateStudents = DataForPricePage
    ? DataForPricePage.num_of_students
    : undefined;
  const numOfStudents =
    parsePositiveInt(stateStudents) ||
    parsePositiveInt(searchParams.get('num_students'));
  const showHevolveBusiness = Boolean(
    (DataForPricePage &&
      stateStudents !== undefined &&
      stateStudents !== null &&
      stateStudents !== '') ||
    numOfStudents !== null
  );
  // const [showAlert, setShowAlert] = useState(false);

  const [subscriptionData, setSubscriptionData] = useState(null);
  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIshevolvedroid(userAgent.includes('hevolvedroid'));
  }, []);

  // const hideAlertAfterDelay = () => {
  //     // Hide the alert after 5 seconds (5000 milliseconds)
  //     setTimeout(() => {
  //         setShowAlert(false);
  //     }, 5000);
  // };

  useEffect(() => {
    const getSubscriptionsByPlans = async () => {
      try {
        const data = await mailerApi.getPlans();
        logger.log(data);

        const filteredData = data.filter((subscription) => {
          // A link that names this plan is an offer of exactly this plan, so it
          // is listed even where the public list would hide it.
          if (
            requestedPlanId !== null &&
            subscription.plan_id === requestedPlanId
          ) {
            return true;
          }
          // Exclude specific prices
          const excludePrices = [29, 299];
          const shouldExclude = excludePrices.includes(subscription.price);

          if (showHevolveBusiness) {
            return subscription.title === 'Hevolve Business' && !shouldExclude;
          } else {
            return subscription.title !== 'Hevolve Business' && !shouldExclude;
          }
        });

        if (hevolvedroid) {
          setSubscriptionData(
            filteredData.filter(
              (subscription) =>
                subscription.price !== 0 && subscription.title !== 'Free'
            )
          );
        } else {
          setSubscriptionData(filteredData);
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error.message);
      }
    };

    getSubscriptionsByPlans();
  }, [showHevolveBusiness, hevolvedroid, requestedPlanId]);

  // The plan a link named, if it is in the list; the notice below says so when it is not.
  const selectedPlanId =
    requestedPlanId !== null &&
    subscriptionData &&
    subscriptionData.some(
      (subscription) => subscription.plan_id === requestedPlanId
    )
      ? requestedPlanId
      : null;
  const requestedPlanMissing =
    requestedPlanId !== null &&
    subscriptionData !== null &&
    selectedPlanId === null;

  useEffect(() => {
    if (selectedPlanId === null) return;
    const card = document.getElementById(`plan-card-${selectedPlanId}`);
    if (card && typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({block: 'center'});
    }
  }, [selectedPlanId]);

  // The whole checkout (bearer token, phone from the signed-in session,
  // subscription row first and then payment at the server's own price) is
  // usePlanCheckout.
  const handlePayNowClick = (subscription) => {
    ReactGA.event({
      category: 'Button',
      action: 'Click',
      label: 'Payment Page Click',
    });
    buy(subscription, {numStudents: seatsFor(subscription, numOfStudents)});
  };

  return (
    <>
      {/* {showAlert && (
                    <Alert style={{textAlign:'center'}} severity="error">Please sign up or login first.</Alert>
                )} */}
      <CheckoutSignIn signIn={signIn} onClose={closeSignIn} />
      {requestedPlanMissing && (
        <p role="status" className="text-slate-400 text-center mt-6">
          Plan {requestedPlanId} is not available. Pick one of the plans below.
        </p>
      )}
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 mt-6 gap-6">
        {subscriptionData &&
          subscriptionData.map((subscription) => {
            const seats = seatsFor(subscription, numOfStudents);
            const selected = subscription.plan_id === selectedPlanId;
            return (
              <div
                key={subscription.plan_id}
                id={`plan-card-${subscription.plan_id}`}
                data-selected={selected ? 'true' : undefined}
                aria-current={selected ? 'true' : undefined}
                style={{
                  backgroundColor: '#1E1E1E',
                  ...(selected ? {boxShadow: '0 0 0 2px #00e89d'} : null),
                }}
                className="relative overflow-hidden rounded-md shadow dark:shadow-gray-800"
              >
                <div className="p-6">
                  {selected && (
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{color: '#00e89d'}}
                    >
                      Selected plan
                    </p>
                  )}
                  <h5 className="text-2xl leading-normal font-semibold">
                    {subscription.title}
                  </h5>
                  <p className="text-slate-400 mt-2">
                    {subscription.description}
                  </p>
                  <div className="flex mt-4">
                    <span className="text-lg font-semibold">₹</span>
                    <span className="text-5xl font-semibold mb-0 ms-1">
                      {totalFor(subscription, seats)}
                    </span>
                  </div>
                  <p className="text-slate-400 uppercase text-xs">
                    per month/ For {seats} User
                  </p>

                  <div className="mt-6">
                    {subscription.price === 0 ? (
                      <button
                        disabled={busyPlanId !== null}
                        style={{
                          background:
                            'linear-gradient(to right, #00e89d, #0078ff)',
                          backgroundImage:
                            'linear-gradient(to right, rgb(0, 232, 157), rgb(0, 120, 255))',
                          borderColor: '#00f0c5',
                          color: '#FFFAE8',
                          transition: 'background-color 0.3s ease',
                        }}
                        onClick={() => handlePayNowClick(subscription)}
                        className="btn-feedback py-2 px-5 inline-block font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-amber-400/5 hover:bg-amber-400 rounded border-amber-400/10 hover:border-amber-400 text-amber-400 hover:text-white disabled:opacity-60 disabled:cursor-wait"
                      >
                        Register For Free
                      </button>
                    ) : (
                      <button
                        disabled={busyPlanId !== null}
                        onClick={() => handlePayNowClick(subscription)}
                        style={{
                          background:
                            'linear-gradient(to right, #00e89d, #0078ff)',
                          backgroundImage:
                            'linear-gradient(to right, rgb(0, 232, 157), rgb(0, 120, 255))',
                          borderColor: '#00f0c5',
                          color: '#FFFAE8',
                          transition: 'background-color 0.3s ease',
                        }}
                        className="btn-feedback py-2 px-5 inline-block font-semibold tracking-wide border align-middle duration-500 text-base text-center bg-amber-400/5 hover:bg-amber-400 rounded border-amber-400/10 hover:border-amber-400 text-amber-400 hover:text-white disabled:opacity-60 disabled:cursor-wait"
                      >
                        Pay Now
                      </button>
                    )}
                    {/* Only a free plan that lasts 14 days has no card to take and a
                      14-day trial to offer.  This line used to sit under every
                      card, paid ones included. */}
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

                <div className="p-6 bg-gray-50 dark:bg-slate-800">
                  <ul className="list-none text-slate-400">
                    <li className="font-semibold text-slate-900 dark:text-white text-sm uppercase">
                      Features:
                    </li>

                    {subscription.features.map((feature, index) => (
                      <li key={index} className="flex items-center mt-2">
                        {feature.access ? (
                          <FiCheckCircle className="text-green-600 h-[18px] w-[18px] me-2" />
                        ) : (
                          <AiOutlineClose className=" text-red-600 h-[18px] w-[18px] me-2" />
                        )}
                        <span
                          className={`text-slate-900 ${feature.access ? 'dark:text-white' : 'dark:text-white'} me-1 font-semibold`}
                        >
                          {feature.name}
                        </span>
                        {feature.daily && (
                          <span className="text-slate-400 me-1 font-semibold">
                            Daily: {feature.daily}
                          </span>
                        )}
                        {feature.monthly && (
                          <span className="text-slate-400 me-1 font-semibold">
                            Monthly: {feature.monthly}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
