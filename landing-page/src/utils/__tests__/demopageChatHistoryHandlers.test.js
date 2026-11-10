/**
 * Demopage's chat-history code, RUN, not read: getChatStorageKey,
 * saveMessagesToStorage, readLocalMessages and loadMessagesFromStorage, the
 * agents-fetch restore that follows them, and isGlobalSetupCard.  Demopage is
 * too large to render in a unit test, so each piece's real text is cut out of
 * the page between the markers below and executed with the page's state
 * stubbed (the way __tests__/hooks/openMicAddressed.test.js runs the mic
 * handlers).  A changed handler changes what these tests see; a missing
 * marker fails loudly.
 *
 * The cases are the ones measured or reported on 2026-11-04:
 *   - a list of setup cards alone was saved over agent 54's chat;
 *   - the server copy (/conversation) merges back only while that agent is
 *     open;
 *   - an agent-list reload (sign-in, sign-out) before the next save put the
 *     restored history below today's chat, and the next save posted two old
 *     messages as a new row (review of fc660500);
 *   - two "next" turns in a row came back as one (review of fc660500).
 *
 * DEMOPAGE=<path> runs the same tests against another copy of Demopage.js.
 */
import { mergeRestoredMessages } from '../mergeRestoredMessages';
import { normalizeRestoredMessages } from '../normalizeRestoredMessages';
import { holdsAgentChat, isSetupCard, restoreServerHistory } from '../serverChatHistory';

import fs from 'fs';
import path from 'path';

const PAGE = process.env.DEMOPAGE || path.join(__dirname, '..', '..', 'pages', 'Demopage.js');
const SRC = fs.readFileSync(PAGE, 'utf8');

function cut(src, start, end, inclusive = false) {
  const a = src.indexOf(start);
  if (a < 0) throw new Error(`Demopage marker not found: ${start}`);
  const b = src.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Demopage end marker not found after ${start}: ${end}`);
  return src.slice(a, inclusive ? b + end.length : b);
}

const STORAGE_CODE = cut(SRC, 'const getChatStorageKey = (promptId) => {', 'const getVideoWidthforMobile = () => {');
const RESTORE_CODE = cut(
  SRC,
  'const savedMessages = loadMessagesFromStorage(savedAgent.prompt_id || savedAgent.id);',
  'setMessages((prev) => mergeRestoredMessages(savedMessages, prev));',
  true,
);
const CARD_RULE_CODE = cut(SRC, 'function isGlobalSetupCard(message) {', '\n}', true);

const quiet = {log: () => {}, warn: () => {}, error: () => {}};

// The page as far as this code sees it: localStorage, fetch (POSTs recorded,
// GETs answered with `rows`), the message state, and the open agent.
function chatPage({rows = [], open = 54, userId = '10202'} = {}) {
  const store = new Map();
  const page = {state: [], posts: [], gets: [], rows, store};
  page.currentAgentRef = {current: {prompt_id: open, name: 'Personalised Learning'}};
  page.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
  };
  page.setMessages = (update) => {
    page.state = typeof update === 'function' ? update(page.state) : update;
  };
  page.fetch = (url, init) => {
    if (init && init.method === 'POST') {
      page.posts.push(JSON.parse(init.body));
      return Promise.resolve({ok: true, json: () => Promise.resolve({})});
    }
    page.gets.push(url);
    return Promise.resolve({ok: true, json: () => Promise.resolve(page.rows)});
  };
  const names = ['holdsAgentChat', 'restoreServerHistory', 'normalizeRestoredMessages', 'currentAgent',
    'currentAgentRef', 'effectiveUserId', 'localStorage', 'logger', 'console', 'fetch', 'setMessages'];
  // eslint-disable-next-line no-new-func
  const handlers = new Function(...names,
    `${STORAGE_CODE}\nreturn {saveMessagesToStorage, readLocalMessages, loadMessagesFromStorage};`,
  )(holdsAgentChat, restoreServerHistory, normalizeRestoredMessages, page.currentAgentRef.current,
    page.currentAgentRef, userId, page.localStorage, quiet, quiet, page.fetch, page.setMessages);
  Object.assign(page, handlers);
  // eslint-disable-next-line no-new-func
  const restore = new Function('loadMessagesFromStorage', 'savedAgent', 'setMessages', 'mergeRestoredMessages',
    RESTORE_CODE);
  page.agentsFetchRestore = (agent) =>
    restore(page.loadMessagesFromStorage, agent, page.setMessages, mergeRestoredMessages);
  page.storeChat = (id, messages) => store.set(`chat_messages_${id}`, JSON.stringify({agentId: id, messages}));
  page.stored = (id) => (store.has(`chat_messages_${id}`) ? JSON.parse(store.get(`chat_messages_${id}`)).messages : null);
  // The server copy arrives on a later tick, as fetch does.
  page.settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  return page;
}

const msg = (type, content, timestamp) => ({type, content, timestamp});
const row = (convId, createdDate, request, response) => ({
  conv_id: convId, created_date: createdDate, request, response, topic: 'agent_54', user_id: '10202',
});
const cards = () => [
  {type: 'setup_progress', jobType: 'tts_setup', steps: []},
  {type: 'llm_setup_card', content: 'No local AI setup found.', setupCard: {model_name: 'Qwen'}},
];
const chatText = (list) => list.filter((m) => m.type === 'user' || m.type === 'assistant').map((m) => m.content);

describe('saveMessagesToStorage, run', () => {
  test("setup cards alone are neither stored nor posted (2026-11-04 they replaced agent 54's chat)", () => {
    const page = chatPage();
    page.storeChat(54, [msg('user', 'hi', '2026-10-03T13:14:10.000Z'), msg('assistant', 'Hello!', '2026-10-03T13:14:11.000Z')]);
    page.saveMessagesToStorage(cards(), 54);
    expect(chatText(page.stored(54))).toEqual(['hi', 'Hello!']);
    expect(page.posts).toEqual([]);
  });

  test("a chat is stored and its last two entries posted to the agent's topic", () => {
    const page = chatPage();
    page.saveMessagesToStorage([msg('user', 'hi', '2026-11-04T04:30:00.000Z'), msg('assistant', 'Hello!', '2026-11-04T04:30:05.000Z')], 54);
    expect(chatText(page.stored(54))).toEqual(['hi', 'Hello!']);
    expect(page.posts).toEqual([{user_id: '10202', request: 'hi', response: 'Hello!', topic: 'agent_54'}]);
  });
});

describe('loadMessagesFromStorage and the agents-fetch restore, run', () => {
  const augustRows = [
    row(1, '2026-08-03T10:00:00+00:00', 'next', 'Page 2.'),
    row(2, '2026-08-03T10:01:00+00:00', 'next', 'Page 3.'),
  ];

  test('a stored list of setup cards gets the server copy back, in front of the cards', async () => {
    const page = chatPage({rows: augustRows});
    page.storeChat(54, cards());
    page.agentsFetchRestore({prompt_id: 54});
    await page.settle();
    expect(page.gets).toEqual(['/conversation?user_id=10202&topic=agent_54&limit=1000']);
    expect(chatText(page.state)).toEqual(['next', 'Page 2.', 'next', 'Page 3.']);
    expect(page.state.slice(-2).every(isSetupCard)).toBe(true);
  });

  test('a message sent before the agent list returned stays, after the stored chat', async () => {
    const page = chatPage();
    page.storeChat(54, [msg('user', 'old q', '2026-11-03T09:00:00.000Z'), msg('assistant', 'old a', '2026-11-03T09:00:05.000Z')]);
    page.state = [msg('user', 'hey', '2026-11-04T10:00:00.000Z')];
    page.agentsFetchRestore({prompt_id: 54});
    await page.settle();
    expect(chatText(page.state)).toEqual(['old q', 'old a', 'hey']);
  });

  test('the server copy is left out when another agent is open by the time it arrives', async () => {
    const page = chatPage({rows: augustRows, open: 99});
    page.storeChat(54, cards());
    page.agentsFetchRestore({prompt_id: 54});
    await page.settle();
    expect(chatText(page.state)).toEqual([]);
  });

  test("an agent-list reload before the next save keeps the history in front of today's chat", async () => {
    const page = chatPage({rows: augustRows});
    page.storeChat(54, [msg('user', 'today q', '2026-11-04T04:30:00.000Z'), msg('assistant', 'today a', '2026-11-04T04:30:05.000Z')]);
    page.agentsFetchRestore({prompt_id: 54});
    await page.settle();
    page.agentsFetchRestore({prompt_id: 54}); // a sign-in or sign-out reloads the agent list
    await page.settle();
    expect(chatText(page.state)).toEqual(['next', 'Page 2.', 'next', 'Page 3.', 'today q', 'today a']);

    page.saveMessagesToStorage(page.state, 54);
    const post = page.posts[page.posts.length - 1];
    expect([post.request, post.response]).toEqual(['today q', 'today a']);
    expect(chatText(page.stored(54))).toEqual(['next', 'Page 2.', 'next', 'Page 3.', 'today q', 'today a']);
  });
});

describe('isGlobalSetupCard, run', () => {
  // eslint-disable-next-line no-new-func
  const isGlobalSetupCard = new Function('isSetupCard', `${CARD_RULE_CODE}\nreturn isGlobalSetupCard;`)(isSetupCard);

  test('an agent switch carries live setup cards and nothing else', () => {
    expect(isGlobalSetupCard({type: 'setup_progress'})).toBe(true);
    expect(isGlobalSetupCard({type: 'llm_setup_card'})).toBe(true);
    expect(isGlobalSetupCard({type: 'setup_progress', dismissed: true})).toBe(false);
    expect(isGlobalSetupCard({type: 'assistant', content: 'setup_progress'})).toBe(false);
  });
});
