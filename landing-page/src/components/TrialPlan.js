import CheckoutSignIn from './CheckoutSignIn';

import usePlanCheckout from '../hooks/usePlanCheckout';
import {
  FREE_TRIAL_NOTE,
  planIsFreeTrial,
  seatsFor,
  seatsLabel,
  totalFor,
  fetchPlans,
} from '../services/planCheckout';

import React, {useState, useEffect} from 'react';
import ReactGA from 'react-ga';
import {AiOutlineClose} from 'react-icons/ai';
import {FiCheckCircle} from 'react-icons/fi';
import {useLocation} from 'react-router-dom';
import {Swiper as SwiperComponent, SwiperSlide} from 'swiper/react';
import 'swiper/css';

export default function TrialPlan() {
  const location = useLocation();
  const [hevolvedroid, setIshevolvedroid] = useState(false); // Default to false
  const [TrialPlan, setTrialPlan] = useState([]);
  const {DataForPricePage} = location.state || {};
  const [numOfStudents, setNumOfStudents] = useState(null);
  const {buy, busyPlanId, problem, signIn, closeSignIn} = usePlanCheckout({
    notifyApp: hevolvedroid,
  });
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  useEffect(() => {
    if (DataForPricePage && DataForPricePage.num_of_students) {
      setNumOfStudents(DataForPricePage.num_of_students);
    }
  }, [DataForPricePage]);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIshevolvedroid(userAgent.includes('hevolvedroid'));
  }, []);

  useEffect(() => {
    const getSubscriptionsByPlans = async () => {
      try {
        const data = await fetchPlans();

        const showHevolveBusiness =
          DataForPricePage &&
          DataForPricePage.num_of_students !== undefined &&
          DataForPricePage.num_of_students !== null &&
          DataForPricePage.num_of_students !== '';
        const filteredData = data.filter((subscription) => {
          if (showHevolveBusiness) {
            return subscription.title === 'Hevolve Business';
          } else {
            return subscription.title !== 'Hevolve Business';
          }
        });

        // Exclude subscriptions with prices of 0 or 29
        const relevantSubscriptions = filteredData.filter(
          (subscription) =>
            subscription.price !== 0 && subscription.price !== 29
        );
        const TrialPlan = filteredData.filter(
          (subscription) => subscription.price === 29
        );

        setSubscriptionData(relevantSubscriptions);
        setTrialPlan(TrialPlan);
      } catch (error) {
        console.error('Error fetching subscriptions:', error.message);
      }
    };

    getSubscriptionsByPlans();
  }, [DataForPricePage, hevolvedroid]);

  // The whole checkout (bearer token, phone from the signed-in session,
  // subscription row first and then payment at the server's own price) is
  // usePlanCheckout; after signing in the person comes back to /Plan?plan=<id>.
  const handlePayNowClick = (subscription) => {
    ReactGA.event({
      category: 'Button',
      action: 'Click',
      label: 'Payment Page Click',
    });
    buy(subscription, {numStudents: seatsFor(subscription, numOfStudents)});
  };

  return (
    <div>
      <CheckoutSignIn signIn={signIn} onClose={closeSignIn} />
      {hevolvedroid ? (
        <div>
          <SwiperComponent
            spaceBetween={20}
            slidesPerView={1}
            pagination={{clickable: true}}
            navigation
            className="mySwiper"
          >
            {TrialPlan.length > 0 &&
              TrialPlan.map((subscription) => (
                <SwiperSlide
                  key={subscription.plan_id}
                  className={`relative overflow-hidden rounded-md shadow dark:shadow-gray-800 
                                p-6 transition-transform duration-500 
                                ${TrialPlan.indexOf(subscription) === 0 ? 'scale-110' : 'scale-90'} 
                                ${TrialPlan.indexOf(subscription) === 0 ? 'bg-white dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'}`}
                >
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
                    {subscription.price === 0 ? (
                      <button
                        aria-label="Register For Free"
                        disabled={busyPlanId !== null}
                        style={{
                          background:
                            'linear-gradient(to right, #00e89d, #0078ff)',
                          borderColor: '#00f0c5',
                          color: '#FFFAE8',
                        }}
                        onClick={() => handlePayNowClick(subscription)}
                        className="btn-feedback py-2 px-5 inline-block font-semibold tracking-wide border rounded text-amber-400 hover:text-white"
                      >
                        Register For Free
                      </button>
                    ) : (
                      <button
                        aria-label="Pay Now"
                        disabled={busyPlanId !== null}
                        onClick={() => handlePayNowClick(subscription)}
                        style={{
                          background:
                            'linear-gradient(to right, #00e89d, #0078ff)',
                          borderColor: '#00f0c5',
                          color: '#FFFAE8',
                        }}
                        className="btn-feedback py-2 px-5 inline-block font-semibold tracking-wide border rounded text-amber-400 hover:text-white"
                      >
                        Pay Now
                      </button>
                    )}
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
                  <div className="p-6 bg-gray-50 dark:bg-slate-800">
                    <ul className="list-none text-slate-400">
                      <li className="font-semibold text-slate-900 dark:text-white text-sm uppercase">
                        Features:
                      </li>
                      {subscription.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center mt-2">
                          {feature.access ? (
                            <FiCheckCircle className="text-green-600 h-[18px] w-[18px] me-2" />
                          ) : (
                            <AiOutlineClose className="text-red-600 h-[18px] w-[18px] me-2" />
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
                </SwiperSlide>
              ))}
          </SwiperComponent>
        </div>
      ) : (
        <div>
          <SwiperComponent
            spaceBetween={20}
            slidesPerView={2.1}
            pagination={{clickable: true}}
            navigation
            className="mySwiper"
            onSlideChange={(swiper) => setActiveSlide(swiper.activeIndex)}
          >
            {subscriptionData.length > 0 &&
              subscriptionData.map((subscription, index) => (
                <SwiperSlide
                  key={subscription.plan_id}
                  className={`relative overflow-hidden rounded-md shadow dark:shadow-gray-800 
                                    p-6 transition-transform duration-300 
                                    ${index === activeSlide ? 'scale-100' : 'scale-90'} 
                                    ${index === activeSlide ? 'bg-white dark:bg-gray-700' : 'bg-gray-200 dark:bg-gray-800'}`}
                >
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
                    {subscription.price === 0 ? (
                      <button
                        aria-label="Register For Free"
                        disabled={busyPlanId !== null}
                        style={{
                          background:
                            'linear-gradient(to right, #00e89d, #0078ff)',
                          borderColor: '#00f0c5',
                          color: '#FFFAE8',
                        }}
                        onClick={() => handlePayNowClick(subscription)}
                        className="btn-feedback py-2 px-5 inline-block font-semibold tracking-wide border rounded text-amber-400 hover:text-white"
                      >
                        Register For Free
                      </button>
                    ) : (
                      <button
                        aria-label="Pay Now"
                        disabled={busyPlanId !== null}
                        onClick={() => handlePayNowClick(subscription)}
                        style={{
                          background:
                            'linear-gradient(to right, #00e89d, #0078ff)',
                          borderColor: '#00f0c5',
                          color: '#FFFAE8',
                        }}
                        className="btn-feedback py-2 px-5 inline-block font-semibold tracking-wide border rounded text-amber-400 hover:text-white"
                      >
                        Pay Now
                      </button>
                    )}
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
                  <div className="p-6 bg-gray-50 dark:bg-slate-800">
                    <ul className="list-none text-slate-400">
                      <li className="font-semibold text-slate-900 dark:text-white text-sm uppercase">
                        Features:
                      </li>
                      {subscription.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center mt-2">
                          {feature.access ? (
                            <FiCheckCircle className="text-green-600 h-[18px] w-[18px] me-2" />
                          ) : (
                            <AiOutlineClose className="text-red-600 h-[18px] w-[18px] me-2" />
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
                </SwiperSlide>
              ))}
          </SwiperComponent>
        </div>
      )}
    </div>
  );
}
