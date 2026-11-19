import {redirectToPayment, startCheckout} from '../services/planCheckout';
import {checkoutReturnPath, hasCloudSession} from '../utils/checkoutSession';

import {useCallback, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

/**
 * What a "buy this plan" button does with the outcome of startCheckout.
 *
 * Port of Hevolve web's src/hooks/usePlanCheckout.js (commit ab8555c).  One
 * difference: this site has no /signin page, only the OtpAuthModal, so a person
 * who is not signed in gets the modal on the same page (`signIn`) and, once
 * signed in, is taken to the plan they chose (the modal's returnTo).
 *
 *   redirect  leave for the payment page
 *   sign_in   `signIn` becomes {returnPath}; the page shows <CheckoutSignIn>
 *   free      a free plan is granted, not bought: no calls; a signed-in person
 *             goes on to their agents, anyone else to register
 *   error     keep the server's reason in `problem` for the card to show
 *
 * `buy` ignores a second click while one checkout is running: each click mints
 * a transaction and writes a pending subscription row, so two clicks would
 * leave two rows.
 *
 * @param notifyApp  true inside the Android webview (tells the app the transaction id)
 * @returns {buy(plan, {numStudents, shownAmount, returnPath}), busyPlanId,
 *          problem, signIn, closeSignIn}
 *          where problem is {planId, message} or null, signIn is {returnPath} or null
 */
export default function usePlanCheckout({notifyApp = false} = {}) {
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [problem, setProblem] = useState(null);
  const [signIn, setSignIn] = useState(null);

  const closeSignIn = useCallback(() => setSignIn(null), []);

  const buy = useCallback(
    async (
      plan,
      {numStudents = null, shownAmount = null, returnPath = null} = {}
    ) => {
      if (inFlight.current) return {status: 'busy'};
      inFlight.current = true;
      setBusyPlanId(plan.plan_id);
      setProblem(null);
      let leaving = false;
      try {
        const outcome = await startCheckout({
          plan,
          numStudents,
          shownAmount,
          notifyApp,
        });
        if (outcome.status === 'redirect') {
          leaving = true;
          redirectToPayment(outcome.url);
        } else if (outcome.status === 'sign_in') {
          setSignIn({
            returnPath:
              returnPath || checkoutReturnPath(plan.plan_id, numStudents),
          });
        } else if (outcome.status === 'free') {
          navigate(hasCloudSession() ? '/agents/Hevolve' : '/signup');
        } else {
          setProblem({planId: plan.plan_id, message: outcome.message});
        }
        return outcome;
      } finally {
        inFlight.current = false;
        // The page is navigating away on redirect: keep the button disabled until it does.
        if (!leaving) setBusyPlanId(null);
      }
    },
    [navigate, notifyApp]
  );

  return {buy, busyPlanId, problem, signIn, closeSignIn};
}
