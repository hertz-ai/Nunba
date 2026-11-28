/* eslint-disable */
/**
 * The create form makes the agent on this desktop, with its face (owner 2026-11-28,
 * "Create locally, sync up").
 *
 * MEASURED live on build #7, 28 Nov (finding F11-a): no agent on the desktop had a face.
 * The form uploaded the face to this PC but made the agent on central (/db/create_prompt),
 * whose agent row never names a local face, so no agent opened in video and no idle face
 * was made.  Now the form's seed (name, description, uploaded teacher_avatar_id) goes to
 * the page's own conversational creation, the one a guest's agent is made by; each of its
 * creation turns names the face, and HARTOS keeps it on the saved record
 * (_stamp_agent_face), which /prompts lists.
 *
 * Demopage is too large to render in a unit test, so its handlers and the turn's face rule
 * are cut out of Demopage.js and run as written, as twoAgentsOneName.test.js does.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');

function cutPage(start, end) {
  const a = SRC.indexOf(start);
  if (a < 0) throw new Error(`Demopage marker not found: ${start}`);
  const b = SRC.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Demopage end marker not found after ${start}: ${end}`);
  return SRC.slice(a, b);
}

const CLICK = cutPage('  const handleCreateAgentClick = (seed) => {', '  const handleAgentSelect = (agent) => {');
// The form's own handler: the one the page mounts as CreateAgentForm's onSubmit.
const FORM_MOUNT = cutPage('<CreateAgentForm', '/>');
const TURN_FACE = cutPage("...((mediaMode === 'video' || turnAgent?.create_agent)",
  'create_agent: turnAgent?.create_agent || false,');

function chatPage({signedIn = true, guest = false} = {}) {
  const page = {open: {prompt_id: 95568353503, name: 'Speech Therapy Companion'}, urls: [],
                input: '', formShown: null, modal: false, messages: [{type: 'user', content: 'hi'}],
                saved: [], sent: [], ticks: []};
  page.tick = () => { const due = page.ticks.splice(0); due.forEach((t) => t.fn()); };
  const scope = {
    isAuthenticated: signedIn,
    isGuestMode: guest,
    setIsModalOpen: (v) => { page.modal = v; },
    // The page's state as the handler's render saw it.
    currentAgent: page.open,
    messages: page.messages,
    saveMessagesToStorage: (...a) => { page.saved.push(a); },
    setMessages: (v) => { page.messages = typeof v === 'function' ? v(page.messages) : v; },
    setCurrentAgent: (v) => { page.open = typeof v === 'function' ? v(page.open) : v; },
    setInputMessage: (v) => { page.input = v; },
    setShowCreateAgentForm: (v) => { page.formShown = v; },
    setAllAgents: () => {},
    isGlobalSetupCard: () => false,
    // The page's own send (handleSend through its ref), on the tick after the seed
    // lands: the tick runs when the test says so.
    handleSendRef: {current: (...a) => { page.sent.push({input: page.input, agent: page.open, args: a}); }},
    setTimeout: (fn, ms) => { page.ticks.push({fn, ms}); return page.ticks.length; },
    navigate: (url) => { page.urls.push(url); },
    agentPath: (a) => `/agents/x?id=${a.prompt_id}`,
    logger: {log: () => {}},
    console: {error: () => {}},
  };
  page.run = (code) => {
    const names = Object.keys(scope);
    // eslint-disable-next-line no-new-func
    return new Function(...names, code)(...names.map((n) => scope[n]));
  };
  return page;
}

const SEED = {fromCreateForm: true, name: 'Maxwell', prompt: 'Explains electromagnetism as a story.',
              is_public: false, media: 'video', voice_clone: false, teacher_avatar_id: 1000000017};

describe('the create form makes the agent here', () => {
  test('the page mounts the click handler as the form\'s submit', () => {
    expect(FORM_MOUNT).toContain('onSubmit={handleCreateAgentClick}');
  });

  test('the form seed starts the local creation with the face, the name and the description', () => {
    const page = chatPage();
    page.run(`${CLICK}\nreturn handleCreateAgentClick;`)(SEED);
    expect(page.open).toMatchObject({name: 'Maxwell', type: 'local', create_agent: true,
                                     agent_status: 'Creation Mode', teacher_avatar_id: 1000000017,
                                     is_public: false});
    expect(page.input).toBe('Create an agent named "Maxwell". Explains electromagnetism as a story.');
    expect(page.formShown).toBe(false);
    expect(page.urls).toEqual([]); // nothing made on central, no page to go to yet
    expect(page.saved).toHaveLength(1); // the last agent's chat is kept
  });

  test('the description is SENT as the first creation turn, on the tick after it lands', () => {
    // Review M2: left in the box, the open mic's first words became the creation turn.
    const page = chatPage();
    page.run(`${CLICK}\nreturn handleCreateAgentClick;`)(SEED);
    expect(page.sent).toEqual([]); // not before the page holds the new agent
    expect(page.ticks.map((t) => t.ms)).toEqual([50]);
    page.tick();
    expect(page.sent).toHaveLength(1);
    expect(page.sent[0].input).toBe('Create an agent named "Maxwell". Explains electromagnetism as a story.');
    expect(page.sent[0].agent).toMatchObject({create_agent: true, teacher_avatar_id: 1000000017});
    expect(page.sent[0].args).toEqual([]); // a typed turn, never an open-mic one
  });

  test('a click sends nothing', () => {
    const page = chatPage({guest: true});
    page.run(`${CLICK}\nreturn handleCreateAgentClick;`)({type: 'click'});
    page.tick();
    expect(page.sent).toEqual([]);
  });

  test('signed in and online, the form still makes it here', async () => {
    const original = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => true});
    try {
      const page = chatPage({signedIn: true, guest: false});
      page.run(`${CLICK}\nreturn handleCreateAgentClick;`)(SEED);
      expect(page.open.create_agent).toBe(true);
    } finally {
      Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => original});
    }
  });

  test('a seed with no face makes an agent with none', async () => {
    const page = chatPage();
    const {teacher_avatar_id, ...noFace} = SEED;
    page.run(`${CLICK}\nreturn handleCreateAgentClick;`)({...noFace, media: 'voice'});
    expect(page.open.create_agent).toBe(true);
    expect(page.open).not.toHaveProperty('teacher_avatar_id');
  });

  test('a click (an event, not a seed) signed in and online opens the form, as before', () => {
    const original = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => true});
    try {
      const page = chatPage({signedIn: true, guest: false});
      page.run(`${CLICK}\nreturn handleCreateAgentClick;`)({type: 'click', fromCreateForm: undefined});
      expect(page.formShown).toBe(true);
      expect(page.open.prompt_id).toBe(95568353503);
    } finally {
      Object.defineProperty(navigator, 'onLine', {configurable: true, get: () => original});
    }
  });

  test('a click by a guest starts the local creation with no face and an empty box, as before', () => {
    const page = chatPage({guest: true});
    page.run(`${CLICK}\nreturn handleCreateAgentClick;`)({type: 'click'});
    expect(page.open).toMatchObject({name: 'New Agent', create_agent: true});
    expect(page.open).not.toHaveProperty('teacher_avatar_id');
    expect(page.input).toBe('');
  });

  test('signed out, a seed opens the sign-in, as a click does', async () => {
    const page = chatPage({signedIn: false});
    page.run(`${CLICK}\nreturn handleCreateAgentClick;`)(SEED);
    expect(page.modal).toBe(true);
    expect(page.open.prompt_id).toBe(95568353503);
  });
});

describe("a turn names the agent's face", () => {
  // eslint-disable-next-line no-new-func
  const fields = new Function('mediaMode', 'turnAgent', `return ({ ${TURN_FACE} });`);
  const face = {teacher_avatar_id: 1000000017};

  test('on a video turn', () => {
    expect(fields('video', face)).toEqual(face);
  });

  test('on a creation turn in any mode, so the saved agent keeps it', () => {
    expect(fields('audio', {...face, create_agent: true})).toEqual(face);
    expect(fields('text', {...face, create_agent: true})).toEqual(face);
  });

  test('not on an audio turn of a made agent, as before', () => {
    expect(fields('audio', face)).toEqual({});
  });

  test('never for an agent with no face', () => {
    expect(fields('video', {create_agent: true})).toEqual({});
  });

  test("a creation turn names the creator's public/private choice, and only a creation turn", () => {
    expect(fields('audio', {create_agent: true, is_public: false})).toEqual({is_public: false});
    expect(fields('video', {create_agent: true, is_public: true, ...face}))
      .toEqual({...face, is_public: true});
    expect(fields('video', {is_public: false, ...face})).toEqual(face); // a made agent's turn
    expect(fields('audio', {create_agent: true, is_public: 'no'})).toEqual({}); // not a choice
  });
});
