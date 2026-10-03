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
// A connection the test opens by hand: it records itself, and the test hands
// it a fake session through onopen.
const mockConnections = [];
jest.mock('autobahn', () => ({
  Connection: class {
    constructor(opts) {
      this.opts = opts;
      this.session = null;
      mockConnections.push(this);
    }

    open() {}

    close() {}
  },
}));
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.reject(new Error('offline'))),
  post: jest.fn(() => Promise.reject(new Error('offline'))),
}));

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

// Game sessions and communities a page asks for.  The worker used to drop a
// subscribe that arrived before its session opened (the page subscribes on
// mount, the session opens later), and never re-subscribed after a reconnect.
describe('requested topics survive the session lifecycle', () => {
  const GAME = 'com.hertzai.hevolve.game.s1';
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const send = (type, payload) => global.onmessage({data: {type, payload}});

  function fakeSession() {
    const s = {
      isOpen: true,
      id: 1,
      handlers: {},
      subscribe: jest.fn((topic, handler) => {
        s.handlers[topic] = handler;
        return Promise.resolve({active: true, topic});
      }),
      unsubscribe: jest.fn(() => Promise.resolve()),
      register: jest.fn(() => Promise.resolve()),
      call: jest.fn(() => Promise.reject({error: 'wamp.error.no_such_registration'})),
      publish: jest.fn(),
    };
    return s;
  }
  const subscribedTo = (session, topic) =>
    session.subscribe.mock.calls.filter(([t]) => t === topic).length;

  async function openConnection() {
    send('INIT', {wsUri: 'ws://test', userId: 'u1'});
    await flush();
    const conn = mockConnections[mockConnections.length - 1];
    return conn;
  }
  async function openSession(conn) {
    const session = fakeSession();
    conn.session = session;
    await conn.onopen(session);
    await flush();
    return session;
  }

  beforeEach(() => {
    mockConnections.length = 0;
    jest.isolateModules(() => {
      require('../../pages/crossbarWorker');
    });
  });

  afterEach(() => {
    send('CLOSE', {});
  });

  test('a subscribe sent before the session opens is subscribed when it opens', async () => {
    send('GAME_SUBSCRIBE', {sessionId: 's1'});
    const conn = await openConnection();
    const session = await openSession(conn);

    expect(subscribedTo(session, GAME)).toBe(1);
    session.handlers[GAME]([{type: 'move', sessionId: 's1'}]);
    expect(posted).toContainEqual({type: 'GAME_EVENT', payload: {type: 'move', sessionId: 's1'}});
  });

  test('asking twice, even while the first reply is in flight, subscribes once', async () => {
    const conn = await openConnection();
    const session = await openSession(conn);

    send('GAME_SUBSCRIBE', {sessionId: 's1'});
    send('GAME_SUBSCRIBE', {sessionId: 's1'});
    await flush();
    send('GAME_SUBSCRIBE', {sessionId: 's1'});
    await flush();

    expect(subscribedTo(session, GAME)).toBe(1);
  });

  test('a reopened session subscribes the requested topics again', async () => {
    const conn = await openConnection();
    await openSession(conn);
    send('COMMUNITY_SUBSCRIBE', {communityId: 'c1'});
    await flush();

    await conn.onclose('closed', {});
    const next = await openSession(conn);

    expect(subscribedTo(next, 'com.hertzai.hevolve.community.c1')).toBe(1);
    next.handlers['com.hertzai.hevolve.community.c1']([{type: 'presence'}]);
    expect(posted).toContainEqual(
      {type: 'COMMUNITY_EVENT', payload: {type: 'presence', communityId: 'c1'}});
  });

  test('a topic released before the session opens is never subscribed', async () => {
    send('GAME_SUBSCRIBE', {sessionId: 's1'});
    send('GAME_UNSUBSCRIBE', {sessionId: 's1'});
    const conn = await openConnection();
    const session = await openSession(conn);

    expect(subscribedTo(session, GAME)).toBe(0);
  });

  // Review of 3e536fb4: the page re-sent TTS_LANG_SUBSCRIBE, but the worker
  // had no case for it, so the "voice changed / unavailable" toast could
  // never fire.
  test('TTS language warnings are subscribed and relayed with their kind', async () => {
    send('TTS_LANG_SUBSCRIBE', {topics: [
      'com.hertzai.hevolve.tts.lang_mismatch',
      'com.hertzai.hevolve.tts.lang_unsupported',
    ]});
    const conn = await openConnection();
    const session = await openSession(conn);

    expect(subscribedTo(session, 'com.hertzai.hevolve.tts.lang_mismatch')).toBe(1);
    session.handlers['com.hertzai.hevolve.tts.lang_unsupported'](
      [JSON.stringify({requested_lang: 'ta'})]);
    expect(posted).toContainEqual({
      type: 'TTS_LANG_EVENT',
      payload: {requested_lang: 'ta', kind: 'unsupported'},
    });

    // Unparseable or empty payloads are dropped, not turned into a toast.
    const before = posted.filter((m) => m.type === 'TTS_LANG_EVENT').length;
    session.handlers['com.hertzai.hevolve.tts.lang_unsupported'](['not json']);
    session.handlers['com.hertzai.hevolve.tts.lang_unsupported']([null]);
    expect(posted.filter((m) => m.type === 'TTS_LANG_EVENT')).toHaveLength(before);
  });

  test('a released topic is unsubscribed and stays gone after a reopen', async () => {
    const conn = await openConnection();
    const session = await openSession(conn);
    send('GAME_SUBSCRIBE', {sessionId: 's1'});
    await flush();

    send('GAME_UNSUBSCRIBE', {sessionId: 's1'});
    expect(session.unsubscribe).toHaveBeenCalledTimes(1);
    await conn.onclose('closed', {});
    const next = await openSession(conn);

    expect(subscribedTo(next, GAME)).toBe(0);
  });
});
