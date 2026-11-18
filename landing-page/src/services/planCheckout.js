/**
 * The one checkout for a plan: create the subscription row, THEN pay.
 *
 * Port of Hevolve web's src/services/planCheckout.js (commit ab8555c).
 *
 * Contract (account store commit 11b2401f, #286 and #202):
 *   POST /addsubscription_by_phone  needs 'Authorization: Bearer <access_token>'
 *     and the token's credential must belong to the target user.  It writes the
 *     pending (switched-off) subscription row.
 *   POST /makepayment  prices the order itself: plan price x num_students.  The
 *     browser's `amount` is only compared with that price (a mismatch is a 400
 *     with a hint).  It refuses free or unknown plans and any transaction that
 *     has no pending row of this user and plan, so it must come second.
 *
 * Every page that sells a plan (Plan, trial plan, speech therapy) calls
 * startCheckout, so the order, the header and the refusals live here once.
 * axios is used directly, not mailerApi, because axiosFactory discards the HTTP
 * status on failure and the checkout has to tell a 401 (go and sign in) from a
 * 400 (show the server's hint).  The token is the one axiosFactory would attach
 * (localStorage access_token), read through utils/checkoutSession.
 */
import {ADD_SUBSCRIPTION_URL, PAYMENT_URL} from '../config/apiBase';
import {readPayer} from '../utils/checkoutSession';

import axios from 'axios';
import {v4 as uuidv4} from 'uuid';

// The field /makepayment multiplies the plan price by (crud.makepayment: plan
// amount x this, for ANY plan, 1..1000).  The one place it is named here.
export const QUANTITY_FIELD = 'num_students';

export const FREE_TRIAL_NOTE = 'No credit card required. Free 14-days trial';
const FREE_TRIAL_DAYS = 14;

/**
 * True only for a plan that is free AND lasts 14 days, which is what the line
 * above promises.  A paid plan, or a free plan of another length, is not it.
 */
export const planIsFreeTrial = (plan) =>
  Boolean(plan) && plan.price === 0 && plan.days === FREE_TRIAL_DAYS;

/** A plan sold per student/child: the plan list calls it type 'business'. */
export const isBusinessPlan = (plan) =>
  Boolean(plan) &&
  (plan.type === 'business' || plan.title === 'Hevolve Business');

/** A whole number >= 1 from a number or a numeric string, else null. */
export function parsePositiveInt(value) {
  let n = NaN;
  if (typeof value === 'number') n = value;
  else if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    n = Number(value);
  }
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** How many students a plan's price is multiplied by: business plans only, else null. */
export const seatsFor = (plan, numStudents) =>
  isBusinessPlan(plan) ? parsePositiveInt(numStudents) || 1 : null;

/** The total the page shows for a plan: price x seats. */
export const totalFor = (plan, seats) => plan.price * (seats || 1);

const newTransactionId = () =>
  `T${uuidv4().replace(/-/g, '').substring(0, 36)}`;

/** Why a call failed, in words the person can act on (the server's detail when it gave one). */
function reasonOf(error) {
  const detail =
    error &&
    error.response &&
    error.response.data &&
    error.response.data.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (error && error.response) {
    return `The server could not process this (${error.response.status}). Please try again, or contact support.`;
  }
  return 'Could not reach the server. Check your connection and try again.';
}

const statusOf = (error) =>
  error && error.response ? error.response.status : null;

/** Tell the Android app which transaction is about to be paid (it stores the id). */
function tellAppAboutTransaction(transactionId) {
  try {
    window.Handy.setTransactionId(
      JSON.stringify({TRANSACTION_ID: transactionId})
    );
  } catch (error) {
    console.error('Could not tell the app about the transaction:', error);
  }
}

/** Send the person to the payment page.  Separate so a page can stub the one navigation. */
export function redirectToPayment(url) {
  window.location.href = url;
}

/**
 * Run the checkout for one plan.
 *
 * @param plan        a row of /getallplandetails ({plan_id, price, ...})
 * @param numStudents how many students/units, or null when the plan is not sold per student
 * @param shownAmount the total the page displayed; defaults to price x numStudents.
 *                    It is sent only so the server can refuse a stale price.
 * @param notifyApp   inside the Android app, tell it the transaction id once payment is ready
 * @returns {status: 'redirect', url, transactionId}  go to the payment page
 *          {status: 'sign_in'}   no usable session (or a 401): sign in, then come back
 *          {status: 'free'}      a free plan is granted, not bought: nothing was called
 *          {status: 'error', message}  nothing was paid; message says why
 */
export async function startCheckout({
  plan,
  numStudents = null,
  shownAmount = null,
  notifyApp = false,
}) {
  // makepayment refuses a free plan ("granted, not bought"), so do not ask it to.
  if (!(plan.price > 0)) return {status: 'free'};

  const payer = readPayer();
  if (!payer) return {status: 'sign_in'};

  const transactionId = newTransactionId();

  try {
    await axios.post(
      ADD_SUBSCRIPTION_URL,
      {
        phone_number: payer.phone,
        plan_id: plan.plan_id,
        transaction_id: transactionId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${payer.accessToken}`,
        },
      }
    );
  } catch (error) {
    // No row, so nothing may be paid.
    return statusOf(error) === 401
      ? {status: 'sign_in', message: reasonOf(error)}
      : {status: 'error', message: reasonOf(error)};
  }

  const payload = {
    mobile_number: payer.phone,
    plan_id: plan.plan_id,
    transaction_id: transactionId,
    amount: shownAmount === null ? totalFor(plan, numStudents) : shownAmount,
  };
  if (numStudents !== null) payload[QUANTITY_FIELD] = numStudents;

  let response;
  try {
    response = await axios.post(PAYMENT_URL, payload, {
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error) {
    return {status: 'error', message: reasonOf(error)};
  }

  const url = response && response.data;
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) {
    return {
      status: 'error',
      message:
        'The payment page did not open. Nothing was charged. Please try again.',
    };
  }

  if (notifyApp) tellAppAboutTransaction(transactionId);
  return {status: 'redirect', url, transactionId};
}
