/**
 * Book-parsing progress moves the bar whatever shape the payload arrives in.
 *
 * Central's pipeline published an OBJECT (crossbarhttp `client.publish(topic,
 * dict)`, pipeline/task.py:58), so handleTopicData's `data.percentage` check
 * saw it. HARTOS publishes the same payload as a JSON STRING (publish_async's
 * Crossbar leg, and the MessageBus Crossbar leg, both json.dumps it), and the
 * check ran before the string was parsed -- so on a central or standalone
 * HARTOS the "Understanding the Content: N%" bar never moved.
 */
jest.mock('autobahn', () => ({}));

const posted = [];
global.postMessage = (message) => posted.push(message);

const {handleTopicData} = require('../../pages/crossbarWorker');

const BOOK_TOPIC = 'com.hertzai.bookparsing.42';
const CHAT_TOPIC = 'com.hertzai.hevolve.chat.42';
const progress = () =>
  posted.filter((m) => m.type === 'PROGRESS_UPDATE').map((m) => m.payload);
const received = () =>
  posted.filter((m) => m.type === 'DATA_RECEIVED').map((m) => m.payload.data);

beforeEach(() => {
  posted.length = 0;
});

test('a JSON-string progress payload moves the bar', () => {
  handleTopicData(
    JSON.stringify({percentage: 40, msg_id: 'p1', request_id: 'r1'}),
    BOOK_TOPIC
  );
  expect(progress()).toEqual([40]);
  expect(received()).toEqual([]);
});

test('an object progress payload still moves the bar', () => {
  handleTopicData({percentage: 55, msg_id: 'p2', request_id: 'r1'}, BOOK_TOPIC);
  expect(progress()).toEqual([55]);
});

test('every page of one book gets through, not only the first', () => {
  ['p3', 'p4', 'p5'].forEach((msgId, i) =>
    handleTopicData(
      {percentage: 10 * (i + 1), msg_id: msgId, request_id: 'r2'},
      BOOK_TOPIC
    )
  );
  expect(progress()).toEqual([10, 20, 30]);
});

test('an apostrophe inside a JSON string survives the parse', () => {
  const payload = {text: ["the PDF's text layer"], msg_id: 'c1', request_id: 'r3'};
  handleTopicData(JSON.stringify(payload), CHAT_TOPIC);
  expect(received()).toEqual([payload]);
});

test('a Python-repr string from an older producer still parses', () => {
  handleTopicData("{'text': ['hi'], 'request_id': 'r4', 'extra': None}", CHAT_TOPIC);
  expect(received()).toEqual([{text: ['hi'], request_id: 'r4', extra: null}]);
});
