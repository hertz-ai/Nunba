/**
 * utils/serverChatHistory — an agent's chat from the page's server copy, put
 * back beside the copy in localStorage.
 *
 * The shapes below are the ones measured on the desktop on 2026-11-04: agent
 * 54's stored chat was 21 setup_progress cards and 1 llm_setup_card, and the
 * server copy (/conversation) still held its pairs, newest first, with re-posted
 * pairs and empty ('', '') rows from the card-only saves.
 */
import {
  holdsAgentChat,
  isSetupCard,
  historyFromServerRows,
  mergeServerHistory,
  restoreServerHistory,
  SERVER_HISTORY_LIMIT,
} from '../serverChatHistory';

import fs from 'fs';
import path from 'path';

const setupCards = () => [
  ...Array.from({length: 21}, (_, i) => ({
    type: 'setup_progress',
    jobType: `tts_setup_${i}`,
    steps: [],
  })),
  {type: 'llm_setup_card', content: 'No local AI setup found.', setupCard: {model_name: 'Qwen'}},
];

const row = (convId, createdDate, request, response) => ({
  conv_id: convId,
  created_date: createdDate,
  request,
  response,
  topic: 'agent_54',
});

describe('holdsAgentChat (the save guard)', () => {
  test('the list that was saved over agent 54 (setup cards only) is not a chat', () => {
    expect(holdsAgentChat(setupCards())).toBe(false);
  });

  test('dismissed setup cards are still only setup cards', () => {
    expect(holdsAgentChat([{type: 'setup_progress', dismissed: true}])).toBe(false);
  });

  test('an empty list or no list is not a chat', () => {
    expect(holdsAgentChat([])).toBe(false);
    expect(holdsAgentChat(undefined)).toBe(false);
  });

  test('setup cards beside one message of the conversation are a chat', () => {
    expect(holdsAgentChat([...setupCards(), {type: 'user', content: 'hi'}])).toBe(true);
  });

  test('anything else on its own is still saved, as before', () => {
    expect(holdsAgentChat([{type: 'system', content: 'Gathering agent details...'}])).toBe(true);
  });

  test('isSetupCard names both card types and nothing else', () => {
    expect(isSetupCard({type: 'setup_progress'})).toBe(true);
    expect(isSetupCard({type: 'llm_setup_card'})).toBe(true);
    expect(isSetupCard({type: 'assistant', content: 'setup_progress'})).toBe(false);
    expect(isSetupCard(null)).toBe(false);
  });
});

describe('historyFromServerRows', () => {
  test('rows arrive newest first and come back oldest first', () => {
    const rows = [
      row(3, '2026-11-04T04:41:42.028+00:00', 'and then?', 'Then page 3.'),
      row(1, '2026-10-03T13:14:12.681+00:00', 'hi', 'Hello! Ready for a lesson?'),
    ];
    expect(historyFromServerRows(rows).map((m) => m.content)).toEqual([
      'hi',
      'Hello! Ready for a lesson?',
      'and then?',
      'Then page 3.',
    ]);
  });

  test('request is the user, response the assistant, each timed by its row', () => {
    const [user, assistant] = historyFromServerRows([
      row(1, '2026-10-03T13:14:12.681+00:00', 'hi', 'Hello!'),
    ]);
    expect(user).toEqual({type: 'user', content: 'hi', timestamp: '2026-10-03T13:14:12.681+00:00'});
    expect(assistant).toEqual({type: 'assistant', content: 'Hello!', timestamp: '2026-10-03T13:14:12.681+00:00'});
  });

  test('a pair posted again by the next save is not repeated', () => {
    const rows = [
      row(1, '2026-10-03T13:14:12+00:00', 'hi', 'hi again'),
      row(2, '2026-10-03T13:14:13+00:00', 'hi', 'hi again'),
      row(3, '2026-10-03T13:14:20+00:00', 'hi again', 'how are you'),
    ];
    expect(historyFromServerRows(rows).map((m) => m.content)).toEqual(['hi', 'hi again', 'how are you']);
  });

  test('the same exchange on another day, with others between, is kept', () => {
    const rows = [
      row(1, '2026-10-03T10:00:00+00:00', 'hi', 'Hello!'),
      row(2, '2026-10-03T10:05:00+00:00', 'teach me fractions', 'Sure.'),
      row(3, '2026-10-05T09:00:00+00:00', 'hi', 'Hello!'),
    ];
    expect(historyFromServerRows(rows)).toHaveLength(6);
  });

  test("the ('', '') rows of the card-only saves give no message", () => {
    expect(historyFromServerRows([row(1, '2026-11-04T04:41:42.299+00:00', '', '')])).toEqual([]);
  });

  test('a response-only row is one assistant message', () => {
    const out = historyFromServerRows([row(1, '2026-10-19T08:19:00+00:00', '', 'I need your input to finish building this.')]);
    expect(out).toEqual([
      {type: 'assistant', content: 'I need your input to finish building this.', timestamp: '2026-10-19T08:19:00+00:00'},
    ]);
  });

  test('anything but a list of rows gives no history', () => {
    expect(historyFromServerRows(null)).toEqual([]);
    expect(historyFromServerRows({error: 'x'})).toEqual([]);
  });
});

describe('mergeServerHistory', () => {
  const history = [
    {type: 'user', content: 'hi', timestamp: '2026-10-03T13:14:12+00:00'},
    {type: 'assistant', content: 'Hello! Ready for a lesson?', timestamp: '2026-10-03T13:14:12+00:00'},
    {type: 'user', content: 'and then?', timestamp: '2026-11-04T04:41:42+00:00'},
    {type: 'assistant', content: 'Then page 3.', timestamp: '2026-11-04T04:41:42+00:00'},
  ];

  test('a stored list of setup cards gets the whole chat back, the cards after it', () => {
    const cards = setupCards();
    const merged = mergeServerHistory(cards, history);
    expect(merged.slice(0, 4).map((m) => m.content)).toEqual([
      'hi',
      'Hello! Ready for a lesson?',
      'and then?',
      'Then page 3.',
    ]);
    expect(merged.slice(4)).toEqual(cards);
  });

  test('only messages older than the first stored one are added, before it', () => {
    const local = [
      {type: 'user', content: 'and then?', timestamp: '2026-11-04T04:41:40.000Z'},
      {type: 'assistant', content: 'Then page 3.', timestamp: '2026-11-04T04:41:41.000Z'},
    ];
    const merged = mergeServerHistory(local, history);
    expect(merged.map((m) => m.content)).toEqual([
      'hi',
      'Hello! Ready for a lesson?',
      'and then?',
      'Then page 3.',
    ]);
    expect(merged.slice(2)).toEqual(local);
  });

  test('a server message newer than the stored chat (one deleted on screen) is not brought back', () => {
    const local = [
      {type: 'user', content: 'hi', timestamp: '2026-10-03T13:14:10.000Z'},
      {type: 'assistant', content: 'Hello! Ready for a lesson?', timestamp: '2026-10-03T13:14:11.000Z'},
    ];
    const deletedOnScreen = [
      ...history.slice(0, 2),
      {type: 'assistant', content: 'retrying in 24s...', timestamp: '2026-10-04T09:00:00+00:00'},
    ];
    expect(mergeServerHistory(local, deletedOnScreen)).toBe(local);
  });

  test('a server message the stored chat already holds is not repeated', () => {
    const local = [
      {type: 'assistant', content: 'Hello! Ready for a lesson?', timestamp: '2026-10-04T00:00:00.000Z'},
    ];
    const merged = mergeServerHistory(local, history);
    expect(merged.map((m) => m.content)).toEqual(['hi', 'Hello! Ready for a lesson?']);
  });

  test('nothing to add returns the same list, so the chat does not re-render', () => {
    const local = [{type: 'user', content: 'hi', timestamp: '2026-10-01T00:00:00.000Z'}];
    expect(mergeServerHistory(local, history.slice(0, 2).map((m) => ({...m, content: 'hi'})))).toBe(local);
    expect(mergeServerHistory(local, [])).toBe(local);
    expect(mergeServerHistory(local, undefined)).toBe(local);
  });
});

describe('restoreServerHistory', () => {
  const okResponse = (rows) => Promise.resolve({ok: true, json: () => Promise.resolve(rows)});

  const run = ({rows = [row(1, '2026-10-03T13:14:12+00:00', 'hi', 'Hello!')], open = true, fetchFn} = {}) => {
    let list = setupCards();
    const urls = [];
    const setMessages = jest.fn((update) => {
      list = typeof update === 'function' ? update(list) : update;
    });
    const promise = restoreServerHistory({
      fetchFn: fetchFn || ((url) => {
        urls.push(url);
        return okResponse(rows);
      }),
      userId: '10202',
      promptId: 54,
      isOpen: () => open,
      setMessages,
    });
    return promise.then((count) => ({count, urls, setMessages, list: () => list}));
  };

  test('asks /conversation for this user and agent, and puts the chat back', async () => {
    const {count, urls, list} = await run();
    expect(urls).toEqual([`/conversation?user_id=10202&topic=agent_54&limit=${SERVER_HISTORY_LIMIT}`]);
    expect(count).toBe(2);
    expect(list().slice(0, 2).map((m) => m.content)).toEqual(['hi', 'Hello!']);
  });

  test('when another agent is open by the time the rows arrive, its list is left alone', async () => {
    const {setMessages} = await run({open: false});
    expect(setMessages).not.toHaveBeenCalled();
  });

  test('a refused or failed request leaves the list alone', async () => {
    const refused = await run({fetchFn: () => Promise.resolve({ok: false, json: () => Promise.resolve([])})});
    expect(refused.setMessages).not.toHaveBeenCalled();
    const failed = await run({fetchFn: () => Promise.reject(new Error('offline'))});
    expect(failed.setMessages).not.toHaveBeenCalled();
    expect(failed.count).toBe(0);
  });

  test('no agent id, no request', async () => {
    const fetchFn = jest.fn();
    await expect(restoreServerHistory({fetchFn, userId: '10202', promptId: undefined, isOpen: () => true, setMessages: jest.fn()})).resolves.toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

// Source guards for the Demopage wiring: Demopage is too large to render in a
// unit test (utils/__tests__/demopageRestoreOnMount.test.js), so these pin
// that it calls the rules above where the 2026-11-04 losses happened.
describe('Demopage wiring', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');
  const SAVE = SRC.match(/const saveMessagesToStorage = \([^)]*\) => \{[\s\S]*?\n {2}\};\n/);
  const LOAD = SRC.match(/const loadMessagesFromStorage = \([^)]*\) => \{[\s\S]*?\n {2}\};\n/);

  test('a save checks holdsAgentChat before it writes or posts anything', () => {
    expect(SAVE).not.toBe(null);
    const save = SAVE[0];
    const guard = save.indexOf('if (!promptId || !holdsAgentChat(messages)) return;');
    expect(guard > 0).toBe(true);
    expect(guard < save.indexOf('localStorage.setItem(')).toBe(true);
    expect(guard < save.indexOf("fetch('/conversation'")).toBe(true);
  });

  test('a load merges the server copy only while that agent is open, with no synchronous request', () => {
    expect(LOAD).not.toBe(null);
    const load = LOAD[0];
    expect(load.includes('restoreServerHistory({')).toBe(true);
    expect(load.includes('const open = currentAgentRef.current;')).toBe(true);
    expect(load.includes('return String(open?.prompt_id || open?.id) === String(id);')).toBe(true);
    expect(load.includes('XMLHttpRequest')).toBe(false);
  });

  test('the switch keeps setup cards by the same card rule the save guard uses', () => {
    expect(SRC.includes('return isSetupCard(message) && !message.dismissed;')).toBe(true);
    expect(SRC.includes("message.type === 'setup_progress' || message.type === 'llm_setup_card'")).toBe(false);
  });
});
