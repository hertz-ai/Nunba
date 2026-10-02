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
