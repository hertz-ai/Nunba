/**
 * The page's own give-up on a silent turn reads "Still working on it", not
 * "canceled".
 *
 * socialApi's chat deadline (CHAT_DEADLINE_MS, 180 s with no trace) aborts
 * the POST, and the page sends the same id again; the resend joins the turn
 * that is still running (Nunba _chat_turn).  axios rejects the abort with its
 * own CanceledError, whose message is "canceled", and classifyError had no case
 * for it.  So the person's bubble read "canceled — retrying in 4s...", and
 * after ten tries "canceled — gave up after 10 attempts", while the agent was
 * still working on the message.  Live 2026-11-27/28: 888 resends of 149
 * messages (conversation audit K10; review rv_gaps C).
 *
 * The abort is made by a real AbortController through the real API client
 * (axiosFactory.createApiClient), so the shape tested is the one the page
 * gets, not a hand-built object.
 */
import {createApiClient} from '../../services/axiosFactory';
import {
  STILL_WORKING_REASON,
  classifyError,
  gaveUpText,
  interruptedText,
  retryingText,
} from '../../utils/chatRetry';

async function anAbortedChatCall() {
  const client = createApiClient('http://127.0.0.1:9', {cache: false});
  const controller = new AbortController();
  controller.abort();
  try {
    await client.post('/chat', {text: 'ball'}, {signal: controller.signal});
  } catch (error) {
    return error;
  }
  throw new Error('the aborted call resolved');
}

describe("the page's own give-up on a running turn", () => {
  test('a real aborted chat call is classified as still working, and is retried', async () => {
    const error = await anAbortedChatCall();
    expect(classifyError(error)).toEqual({reason: STILL_WORKING_REASON, retryable: true, working: true});
  });

  test('the bubble shows no countdown while it waits', () => {
    expect(retryingText(STILL_WORKING_REASON, 4)).toBe('Still working on it...');
    expect(retryingText(STILL_WORKING_REASON, 4)).not.toMatch(/canceled|retrying in/);
  });

  test('when the tries run out it says no answer came, not that it was canceled', () => {
    expect(gaveUpText(STILL_WORKING_REASON, 10)).toBe('No answer came after 10 tries');
  });

  test('a message restored mid-wait after a reload reads as interrupted', () => {
    expect(interruptedText('Still working on it...')).toBe('Send interrupted');
  });
});

describe('every other reason keeps its wording', () => {
  // A unit check of the wording only: on the /chat path an HTTP error reaches
  // classifyError as the server's body (axiosFactory rejects with
  // error.response.data), not as an axios error with a status.
  test('a reason other than still working keeps its countdown and give-up', () => {
    expect(retryingText('Server error (500)', 4)).toBe('Server error (500) — retrying in 4s...');
    expect(gaveUpText('Backend not reachable', 10)).toBe('Backend not reachable — gave up after 10 attempts');
    expect(gaveUpText('', 10)).toBe('Backend unreachable — gave up after 10 attempts');
  });

  test('a restored message drops its countdown and keeps its reason', () => {
    expect(interruptedText('Request timed out — retrying in 8s...')).toBe('Request timed out');
    expect(interruptedText('')).toBe('Send interrupted');
    expect(interruptedText(undefined)).toBe('Send interrupted');
  });
});
