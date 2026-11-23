/**
 * The one checkout for a plan: create the subscription row, THEN pay.
 *
 * It began as a port of Hevolve web's src/services/planCheckout.js (commits
 * ab8555c, cae609f) and keeps that file's contract with the account store:
 * the same two routes, bodies, order and outcomes.  It is no longer a copy.
 * The web's file calls axios itself and reads a refusal from
 * error.response.data.detail; this one goes through axiosFactory's client and
 * reads the keepStatus rejection (error.detail, error.status).  A change to
 * one is not a change to the other: each has its own callers and tests.
 *
 * Contract (account store commits 11b2401f and c1eeb2131, #286 and #202):
 *   POST /addsubscription_by_phone  needs 'Authorization: Bearer <access_token>'
 *     and the token's credential must belong to the target user.  It writes the
 *     pending (switched-off) subscription row.
 *   POST /makepayment  prices the order itself: plan price x quantity.  The
 *     browser's `amount` is only compared with that price (a mismatch is a 400
 *     with a hint).  It refuses free or unknown plans and any transaction that
 *     has no pending row of this user and plan, so it must come second.
 *   GET /getallplandetails  leaves the speech plans off the public list; only
 *     ?plan_id=<id> returns one (fetchPlans).
 *
 * Every page that sells a plan (Plan, trial plan, speech therapy) calls
 * startCheckout, so the order, the header and the refusals live here once.
 * Both writes go through axiosFactory's client, like every other call of the
 * page.  What the checkout needs from it, each asked for by name:
 *   keepStatus   a refusal keeps its HTTP status, so a 401 (go and sign in) is
 *                told from a 400 (show the server's hint);
 *   handle401 off  a 401 here sends the person to sign in with the plan kept;
 *                it must not also clear the session under the page;
 *   silentError  the checkout words every failure itself, so no banner;
 *   sendToken false on /makepayment, which asks for no token;
 *   cache off    nothing here is a cached read.
 * The token the client attaches (localStorage access_token) is the one
 * utils/checkoutSession reads to decide there is a payer at all.
 */
import {createApiClient} from './axiosFactory';
import {mailerApi} from './socialApi';

import {ADD_SUBSCRIPTION_URL, PAYMENT_URL} from '../config/apiBase';
import {readPayer} from '../utils/checkoutSession';

import {v4 as uuidv4} from 'uuid';

// A stalled server must end in a message, not in plan buttons that stay
// disabled until the page is reloaded.  The checkout's client carries it.
export const REQUEST_TIMEOUT_MS = 15000;

// The two URLs are absolute (config/apiBase), so the client has no base.
const checkoutClient = createApiClient(undefined, {
  timeout: REQUEST_TIMEOUT_MS,
  handle401: false,
  cache: false,
});

// The field /makepayment multiplies the plan price by (crud.makepayment: plan
// amount x this, for ANY plan, 1..1000).  The server documents `quantity` as the
// clear name and `num_students` as the same number under its first name; either
// is accepted (both and different is a 400).  The one place it is named here.
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

/** What a card says under the price: one person's price, or the price for N seats. */
export const seatsLabel = (seats) =>
  seats > 1 ? `per month / for ${seats} users` : 'per month / per user';

/**
 * The plan list.  With a plan id it asks GET /getallplandetails?plan_id=<id>, the
 * only way to reach a plan the public list leaves out (the speech plans); a
 * server that ignores the parameter answers the whole list, so callers still
 * pick their plan out of what comes back.
 */
export function fetchPlans(planId = null) {
  return mailerApi.getPlans(planId === null ? undefined : {plan_id: planId});
}

const newTransactionId = () =>
  `T${uuidv4().replace(/-/g, '').substring(0, 36)}`;

// What a buyer is told for each refusal the account store can send.  The
// server's own text names its API (plan_id, quantity, /addsubscription_by_phone),
// which means nothing to someone paying; each real text a buyer can reach is
// turned into words about the buyer's situation.  Anything else keeps the
// server's words.
const PLAIN_REFUSALS = [
  [
    /is not the price of this plan/i,
    'The price of this plan changed while this page was open. Please reload the page and try again.',
  ],
  [
    /does not belong to (the account|user_id)/i,
    'You are signed in to a different account than that phone number. Sign out, then sign in with the phone number you want to pay with.',
  ],
  [
    /No pending subscription/i,
    'We could not start this order. Please try again.',
  ],
  [
    /mobile number must be at least/i,
    'We do not have your phone number. Please sign in again.',
  ],
  [
    /No account has that mobile number|matches more than one account/i,
    'We could not find one account for that phone number. Please sign in again, or contact support.',
  ],
  [
    /No active plan with plan_id/i,
    'This plan is not available any more. Please pick another plan.',
  ],
  [
    /(quantity|num_students) must be between/i,
    'That number is out of range. Choose between 1 and 1000.',
  ],
  [/already (priced|used)/i, 'This order was already used. Please try again.'],
];

const isTimeout = (error) =>
  Boolean(error) &&
  (error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    /timeout/i.test(error.message || ''));

// A refusal arrives as axiosFactory's keepStatus rejection: the server's JSON
// with the HTTP status beside it ({detail, status}), or {status} alone when the
// body was not JSON.  A call that got no answer (timeout, no network) arrives
// as the axios error itself, which has no status.
const statusOf = (error) =>
  error && typeof error.status === 'number' ? error.status : null;

/** Why a call failed, in words the person can act on. */
function reasonOf(error) {
  const status = statusOf(error);
  const detail = status === null ? null : error.detail;
  if (typeof detail === 'string' && detail.trim()) {
    const plain = PLAIN_REFUSALS.find(([pattern]) => pattern.test(detail));
    return plain ? plain[1] : detail;
  }
  if (status !== null) {
    return `The server could not process this (${status}). Please try again, or contact support.`;
  }
  if (isTimeout(error)) {
    return 'The server took too long to answer. Nothing was charged. Please try again.';
  }
  return 'Could not reach the server. Check your connection and try again.';
}

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
    await checkoutClient.post(
      ADD_SUBSCRIPTION_URL,
      {
        phone_number: payer.phone,
        plan_id: plan.plan_id,
        transaction_id: transactionId,
      },
      {keepStatus: true, silentError: true}
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

  let url;
  try {
    url = await checkoutClient.post(PAYMENT_URL, payload, {
      keepStatus: true,
      silentError: true,
      sendToken: false,
    });
  } catch (error) {
    return {status: 'error', message: reasonOf(error)};
  }

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
