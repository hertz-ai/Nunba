/* eslint-disable */
/**
 * Two agents with one name: the gallery opens the one you clicked, and a
 * reload keeps it open.
 *
 * Live 2026-11-25 (design_1125 D1): two agents are both named "Speech Therapy
 * Companion" (prompt ids 95530004763 and 95568353503).  The gallery card went
 * to /agents/<name slug>, and the resolver (utils/agentSlug matchAgentBySlug)
 * matched on the name only.  Demopage's URL effect and Agent.js both use it,
 * so the page always switched to the first of the two, and the second could
 * never be opened from the gallery.
 *
 * Now the card puts the prompt id in the URL (/agents/<slug>?id=<prompt_id>)
 * and the one resolver tries the id first, then the slug.
 *
 * What runs here: the real gallery (Agents.js), the real router and the real
 * agent page (Agent.js).  Demopage is too large to render in a unit test, so
 * it is replaced by a stand-in that records what Demopage would receive (its
 * agentData prop, its route param and its URL).  Demopage's own URL effect is
 * then cut out of Demopage.js and run as written, the way the other Demopage
 * tests do (openMicAddressed, demopageTextOnlyVoiceOnTheDeviceUsed).
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {MemoryRouter, Routes, Route, useLocation} from 'react-router-dom';

import {matchAgentBySlug, agentPath} from '../../../utils/agentSlug';

jest.mock('../../../assets/images/AgentPoster.png', () => 'agent-poster.png', {virtual: true});
jest.mock('../../../components/footer', () => ({__esModule: true, default: () => null}));
jest.mock('../../../components/navbar', () => ({__esModule: true, default: () => null}));
jest.mock('lucide-react', () => {
  const React = require('react');
  return new Proxy({}, {
    get: (_t, name) => (name === '__esModule' ? true : (props) => React.createElement('svg', props)),
  });
});
jest.mock('react-toastify', () => ({
  __esModule: true,
  ToastContainer: () => null,
  toast: {error: jest.fn(), success: jest.fn()},
}));

const mockGetPrompts = jest.fn();
jest.mock('../../../services/socialApi', () => ({
  __esModule: true,
  chatApi: {getPrompts: (...args) => mockGetPrompts(...args)},
}));

// A signed-in guest whose HART is sealed, so Agent.js shows the agent page.
const mockSession = {status: 'guest', identity: {}, hart: {sealed: true, name: '', emoji: ''}};
jest.mock('../../../hooks/useAuthSession', () => ({__esModule: true, default: () => mockSession}));
jest.mock('../../../components/HART/LightYourHART', () => ({__esModule: true, default: () => null}));

// Stand-in for Demopage: records what the real one would get.
const mockDemopageSaw = [];
jest.mock('../../../pages/Demopage', () => {
  const {useLocation, useParams} = require('react-router-dom');
  return {
    __esModule: true,
    default: (props) => {
      const {agentName} = useParams();
      const {search} = useLocation();
      mockDemopageSaw.push({agentData: props.agentData, agentName, search});
      return null;
    },
  };
});

import Agents from '../../../components/Agent/Agents';
import Agent from '../../../components/Agent/Agent';

const FIRST = {
  prompt_id: 95530004763,
  name: 'Speech Therapy Companion',
  description: 'the first one',
  type: 'local',
};
const SECOND = {
  prompt_id: 95568353503,
  name: 'Speech Therapy Companion',
  description: 'the second one',
  type: 'local',
};
const TWINS = [FIRST, SECOND];
const DEFAULT_AGENT_ID = 54; // Agent.js defaultAgentData, shown until the list loads

// ── Demopage's URL effect, cut out of the page and run as written ──
const SRC = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'pages', 'Demopage.js'), 'utf8');
const URL_EFFECT = (() => {
  const start = '    if (agentName) {';
  const a = SRC.indexOf(start);
  if (a < 0) throw new Error('Demopage URL effect not found');
  const b = SRC.indexOf('\n  }, [allAgents, agentName', a);
  if (b < 0) throw new Error('end of the Demopage URL effect not found');
  return SRC.slice(a, b);
})();

// The agent Demopage ends up on.  Its agentData effect makes the prop the
// current agent; then, with its agent list loaded, the URL effect runs.
function demopageOpens({agentData, agentName, search}) {
  let current = agentData;
  const scope = {
    agentName,
    location: {search},
    allAgents: TWINS.map((a) => ({...a})),
    items: [],
    matchAgentBySlug,
    currentAgent: current,
    messages: [],
    logger: {log: () => {}},
    saveMessagesToStorage: () => {},
    isGlobalSetupCard: () => false,
    setMessages: () => {},
    setCurrentAgent: (a) => { current = a; },
    localStorage: {setItem: () => {}},
    setTimeout: () => 0,
    loadMessagesFromStorage: () => [],
    withOpenChatAsks: (m) => m,
    mergeCarriedSetupCards: (m) => m,
    askStatesRef: {current: {}},
    setIdleVideoUrl: () => {},
    setVideoUrl: () => {},
  };
  const names = Object.keys(scope);
  // eslint-disable-next-line no-new-func
  new Function(...names, URL_EFFECT)(...names.map((n) => scope[n]));
  return current;
}

// What the app shows at a URL: the gallery at /agents, the agent page at
// /agents/:agentName.  `where` always holds the router's current location.
const where = {location: null};
function WhereAmI() {
  where.location = useLocation();
  return null;
}
function openApp(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/agents" element={<Agents />} />
        <Route path="/agents/:agentName" element={<Agent />} />
      </Routes>
      <WhereAmI />
    </MemoryRouter>,
  );
}

const lastSaw = () => mockDemopageSaw[mockDemopageSaw.length - 1];

// The agent the page settles on once Agent.js has the agent list.
async function agentOpenedAt(url) {
  openApp(url);
  await waitFor(() => expect(lastSaw()).toBeTruthy());
  await waitFor(() => expect(lastSaw().agentData.prompt_id).not.toBe(DEFAULT_AGENT_ID));
  const saw = lastSaw();
  return {agentPage: saw.agentData, demopage: demopageOpens(saw)};
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDemopageSaw.length = 0;
  mockGetPrompts.mockResolvedValue({prompts: TWINS});
  global.fetch = jest.fn(() => Promise.resolve({ok: false, json: async () => ({})}));
});

describe('two agents with one name', () => {
  test('the second card opens the second agent, and a reload of its URL keeps it', async () => {
    const app = openApp('/agents');
    const card = (await screen.findByText('the second one')).closest('[role="button"]');
    fireEvent.click(card);

    // The card's URL names the agent by id as well as by name.
    const url = where.location.pathname + where.location.search;
    expect(url).toBe('/agents/speech-therapy-companion?id=95568353503');

    // Clicked: the agent page and Demopage both stay on the second agent.
    await waitFor(() => expect(lastSaw()).toBeTruthy());
    expect(lastSaw().agentData.prompt_id).toBe(SECOND.prompt_id);
    expect(demopageOpens(lastSaw()).prompt_id).toBe(SECOND.prompt_id);

    // Reload: the same URL, no router state.
    app.unmount();
    mockDemopageSaw.length = 0;
    const opened = await agentOpenedAt(url);
    expect(opened.agentPage.prompt_id).toBe(SECOND.prompt_id);
    expect(opened.demopage.prompt_id).toBe(SECOND.prompt_id);
  });

  test('a reload of /agents/<slug>?id=<second id> opens the second agent', async () => {
    const opened = await agentOpenedAt('/agents/speech-therapy-companion?id=95568353503');
    expect(opened.agentPage.prompt_id).toBe(SECOND.prompt_id);
    expect(opened.demopage.prompt_id).toBe(SECOND.prompt_id);
  });

  test('a URL with no id resolves by the name, as before (the first of the two)', async () => {
    const opened = await agentOpenedAt('/agents/speech-therapy-companion');
    expect(opened.agentPage.prompt_id).toBe(FIRST.prompt_id);
    expect(opened.demopage.prompt_id).toBe(FIRST.prompt_id);
  });
});

// ── Inside the chat page (design_1125 F1) ──
// Three more places in Demopage.js send the page to an agent's URL: its own
// agent list (the "All Agents" overlay calls the same handler), the cloud
// create form, and the end of a build.  Each is cut out of the page and run
// as written; the URL it goes to then reaches the URL effect above the way
// the router hands it over.

function cutPage(start, end) {
  const a = SRC.indexOf(start);
  if (a < 0) throw new Error(`Demopage marker not found: ${start}`);
  const b = SRC.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Demopage end marker not found after ${start}: ${end}`);
  return SRC.slice(a, b);
}

const SWITCHER = cutPage('  const handleButtonClick = (chat) => {',
  '  useEffect(() => {\n    // Auto-scroll to bottom whenever messages change');
const CREATE_FORM = cutPage('  const handleCreateAgentSubmit = async (agentDatafromApi) => {',
  '  useEffect(() => {\n    // restore-on-mount');
const BUILD_DONE = cutPage("              if (resultData.agent_status === 'completed' && ",
  '\n            }\n            // Track prompt_id from auto-generated creation flow');

// The :agentName param and the query the router hands Demopage for a URL.
// The router decodes each path segment before matching (decodePath).
function routeOf(url) {
  const u = new URL(url, 'http://nunba.local');
  const [, first, segment] = u.pathname.split('/');
  return {
    agentName: first === 'agents' && segment ? decodeURIComponent(segment) : undefined,
    search: u.search,
  };
}

// The chat page with `open` as its agent.  run(code) runs cut page code with
// the page's state stubbed; settlesOn() is the agent open once the URL the
// page went to has been through the URL effect.
function chatPage(open) {
  const page = {open, urls: []};
  const scope = {
    currentAgent: open,
    messages: [],
    logger: {log: () => {}},
    console: {error: () => {}},
    saveMessagesToStorage: () => {},
    isGlobalSetupCard: () => false,
    setMessages: () => {},
    setCurrentAgent: (v) => { page.open = typeof v === 'function' ? v(page.open) : v; },
    setVideoUrl: () => {},
    setIdleVideoUrl: () => {},
    setIsOpen: () => {},
    setShowCreateAgentForm: () => {},
    setAllAgents: () => {},
    setTimeout: () => 0,
    loadMessagesFromStorage: () => [],
    withOpenChatAsks: (m) => m,
    mergeCarriedSetupCards: (m) => m,
    askStatesRef: {current: {}},
    navigate: (url) => { page.urls.push(url); },
    agentPath,
    decryptedUserId: null,
    isGuestMode: true,
    chatApi: {syncAgents: () => Promise.resolve()},
  };
  page.run = (code, extra = {}) => {
    const all = {...scope, ...extra};
    const names = Object.keys(all);
    // eslint-disable-next-line no-new-func
    return new Function(...names, code)(...names.map((n) => all[n]));
  };
  page.settlesOn = () => demopageOpens({agentData: page.open, ...routeOf(page.urls[page.urls.length - 1])});
  return page;
}

describe('two agents with one name, inside the chat page', () => {
  test("the page's own agent list opens the second agent", () => {
    const page = chatPage(FIRST);
    page.run(`${SWITCHER}\nreturn handleButtonClick;`)(SECOND);

    expect(page.settlesOn().prompt_id).toBe(SECOND.prompt_id);
    expect(page.urls).toEqual(['/agents/speech-therapy-companion?id=95568353503']);
  });

  test('the cloud create form opens the agent it made, not an older one of that name', async () => {
    const page = chatPage(FIRST);
    await page.run(`${CREATE_FORM}\nreturn handleCreateAgentSubmit;`)(SECOND);

    expect(page.settlesOn().prompt_id).toBe(SECOND.prompt_id);
    expect(page.urls).toEqual(['/agents/speech-therapy-companion?id=95568353503']);
  });

  test('after a build completes, the page stays on the new agent, not an older one of that name', () => {
    // The create-mode agent of the turn; the server names the finished agent
    // like an older one and returns its new prompt id.
    const building = {prompt_id: SECOND.prompt_id, name: 'New Agent', type: 'local', create_agent: true};
    const page = chatPage(building);
    page.run(BUILD_DONE, {
      turnAgent: building,
      resultData: {agent_status: 'completed', prompt_id: SECOND.prompt_id, agent_name: SECOND.name},
    });

    expect(page.open.name).toBe(SECOND.name);
    expect(page.settlesOn().prompt_id).toBe(SECOND.prompt_id);
    expect(page.urls).toEqual(['/agents/speech-therapy-companion?id=95568353503']);
  });
});
