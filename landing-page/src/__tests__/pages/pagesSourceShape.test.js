/**
 * Jest source-shape smoke for landing-page/src/pages/*.js — batch #44.
 *
 * 21 uncovered pages (OtpAuthModal + chat already have dedicated tests):
 *   AI carousel, controls, agent form, credits, demo, home, signup,
 *   OTP, share, speech therapy, trial pricing, about, contact, worker,
 *   key-gen, index-three, institution, login, newHomeforDemo, pricing,
 *   plain-signup, signup-lite.
 *
 * Many pages import react-router + MUI + context + flat routes —
 * full mount would need an expensive test harness.  Source-shape
 * locks export + basic React-component shape.
 */

const fs = require('fs');
const path = require('path');

const PAGES = [
  'AIAssistantCarousel',
  'Controls',
  'CreateAgentForm',
  'Credits',
  'Demopage',
  'Home',
  'NewSignup',
  'OTPModal',
  'ShareLandingPage',
  'SpeechTherapyPage',
  'TrialPlanPricing',
  'aboutus',
  'contact',
  'crossbarWorker',
  'generateKey',
  'index-three',
  'institution',
  'login',
  'newHomeforDemo',
  'pricing',
  'signup',
  'signuplite',
];

describe('pages/ source-shape smoke (batch #44)', () => {
  PAGES.forEach((name) => {
    describe(name, () => {
      const filePath = path.join(
        __dirname, '..', '..', 'pages', `${name}.js`,
      );

      it('source file exists', () => {
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it('is non-empty', () => {
        const src = fs.readFileSync(filePath, 'utf-8');
        expect(src.length).toBeGreaterThan(0);
      });

      it('declares export OR is a Web Worker (self.onmessage)', () => {
        const src = fs.readFileSync(filePath, 'utf-8');
        // Regular pages export; Web Workers (crossbarWorker) talk
        // via self.onmessage/postMessage instead.
        const hasExport =
          /\bexport\s+/.test(src) || /module\.exports/.test(src);
        const isWebWorker =
          /self\.onmessage/.test(src) ||
          /self\.postMessage/.test(src) ||
          /self\.addEventListener\(['"]message['"]/.test(src) ||
          /onmessage\s*=/.test(src);
        expect(hasExport || isWebWorker).toBe(true);
      });

      it('has no leading git conflict markers', () => {
        const src = fs.readFileSync(filePath, 'utf-8');
        expect(src).not.toMatch(/^<{7} /m);
        expect(src).not.toMatch(/^>{7} /m);
      });
    });
  });
});

// 2026-10-02, measured in the browser: the first message after a restart went
// to the cloud (azurekong /chat/custom_gpt) and no reply came back.  Until the
// agent list loads, the selected agent is Agent.js's hard-coded cloud
// "Hevolve" (prompt_id 54), and the list waited on /agents/sync, which took
// 2 min 15 s after the restart.  The boot queue only waits for the LLM.
describe('Demopage: a send waits until the page knows its agent', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf-8',
  );
  const fetchPromptsBody = src.slice(
    src.indexOf('const fetchPrompts = async'),
    src.indexOf('fetchPrompts();'),
  );

  it('queues a send while the agent list is loading', () => {
    expect(src).toMatch(
      /\(!engineReady && withinEngineBootGrace\) \|\|\s*agentsLoading\s*\)\s*\{\s*setMessageQueue/,
    );
  });

  it('drains the queue only once the agent list has loaded', () => {
    expect(src).toMatch(
      /if \(!loading && engineReady && !agentsLoading && messageQueue\.length > 0\)/,
    );
    expect(src).toMatch(/\}, \[loading, engineReady, agentsLoading\]\);/);
  });

  it('selects the agent the local list names before waiting on the multi-device sync', () => {
    expect(fetchPromptsBody).toMatch(/const knownLocally =/);
    expect(fetchPromptsBody).toMatch(/if \(!knownLocally\) await mergeSyncedAgents\(\);/);
    const selected = fetchPromptsBody.indexOf('setCurrentAgent(savedAgent);');
    const lateSync = fetchPromptsBody.indexOf('if (knownLocally) {');
    expect(selected).toBeGreaterThan(-1);
    expect(lateSync).toBeGreaterThan(selected);
    // The queue opens as soon as the agent is chosen, not after the sync.
    const opened = fetchPromptsBody.slice(0, lateSync).lastIndexOf('setAgentsLoading(false);');
    expect(opened).toBeGreaterThan(selected);
    expect(fetchPromptsBody.slice(lateSync)).toMatch(/await mergeSyncedAgents\(\);/);
  });

  it('has no second routing rule for the loading window', () => {
    expect(src).not.toMatch(/agentListLoadingHere/);
  });
});

// #581: the draft-replacement branch of handleDataReceived read extractedText
// before its `const` declaration (temporal dead zone), so an expert reply
// carrying a speculation_id never replaced its draft.
describe('Demopage: the reply text is read before the draft replacement uses it', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf-8',
  );

  it('declares extractedText above its first use (#581)', () => {
    const declared = src.indexOf('const extractedText');
    const used = src.indexOf('parsed.speculation_id && extractedText');
    expect(declared).toBeGreaterThan(-1);
    expect(used).toBeGreaterThan(declared);
  });
});

// 2026-10-02: "✦ Thought for X" showed with no reply.  The flag behind it,
// isRequestInFlight, was cleared by a thinking trace mid-turn, by a push that
// failed to parse, and by the cloud accepting a message whose reply is pushed
// later; an empty local reply ended the turn with nothing on screen.  A turn
// now ends with its reply, or with the reason on the user's message.
describe('Demopage: a turn that ends without a reply says why', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf-8',
  );
  const between = (from, to) => {
    const start = src.indexOf(from);
    const end = src.indexOf(to, start + from.length);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return src.slice(start, end);
  };

  it('a thinking trace does not end the turn', () => {
    const thinking = between(
      'parsed.action === CHAT_ACTION_THINKING) {', 'const responseVideoUrl');
    expect(thinking).not.toMatch(/setIsRequestInFlight\(false\)/);
  });

  it('an unreadable push or a failed handler does not end the turn', () => {
    expect(between("parsed?.error === 'parse_failed'", 'bumpChatDeadline'))
      .not.toMatch(/setIsRequestInFlight\(false\)/);
    expect(between("console.error('Error processing data:', err);", '}, []);'))
      .not.toMatch(/setIsRequestInFlight\(false\)/);
  });

  it('a cloud send stays open until its pushed reply lands or the wait ends', () => {
    expect(between('const response = await fetch(endpoint', 'if (!response.ok) {'))
      .not.toMatch(/setIsRequestInFlight\(false\)/);
    const accepted = between('// Success', '} catch (err) {');
    expect(accepted).toMatch(/awaitPushedReply\(msgId, sentAt\)/);
    expect(accepted).not.toMatch(/setIsRequestInFlight\(false\)/);
    expect(src).not.toMatch(/Response is taking longer than expected/);
  });

  it('the pushed-reply wait marks an unanswered message with the reason', () => {
    const wait = between('const awaitPushedReply = ', 'const handleSend = async');
    expect(wait).toMatch(/turnHasReply\(/);
    expect(wait).toMatch(/PUSHED_REPLY_MISSING_REASON/);
  });

  it('an empty local reply, an empty plan run and a signed-out send say why', () => {
    expect(between('Routing to LOCAL backend via chatApi', 'if (localSuccess) return;'))
      .toMatch(/EMPTY_REPLY_REASON/);
    expect(between('const handleExecutePlan = useCallback', 'const handleSetupLlm'))
      .toMatch(/EMPTY_REPLY_REASON/);
    expect(between("console.error('Authorization token is missing.');", 'return;'))
      .toMatch(/updateMessageStatus\(msgId, \{ status: 'failed'/);
  });

  it('decides "answered" with the one shared predicate', () => {
    expect(src).toMatch(/import \{[^}]*\bturnHasReply\b[^}]*\} from '\.\.\/utils\/chatRetry'/);
  });
});

describe('pages/ directory integrity', () => {
  const PAGES_DIR = path.join(__dirname, '..', '..', 'pages');

  it('directory exists', () => {
    expect(fs.existsSync(PAGES_DIR)).toBe(true);
  });

  it('contains at least 20 page files', () => {
    const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.js'));
    expect(files.length).toBeGreaterThanOrEqual(20);
  });
});
