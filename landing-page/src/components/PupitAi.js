/* eslint-disable */
import React, {useState, useEffect} from 'react';
import Header from '../pages/Layouts/PupitHeader';
import PupitCardContainer from './PupitCardContainer';
import AppContext from './AppContext';

const PupitAi = () => {
  const [isPupitDroid, setIsPupitDroid] = useState(true);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase(); // Convert to lowercase for a case-insensitive check
    setIsPupitDroid(
      userAgent.includes('pupitdroid') || userAgent.includes('hevolvedroid')
    );
  }, []);

  return (
    <>
      <AppContext.Provider value={{isPupitDroid}}>
        {!isPupitDroid && <Header />}
        <PupitCardContainer />
      </AppContext.Provider>
    </>
  );
};

export default PupitAi;
