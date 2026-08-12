/**
 * End-to-end chat turn in REAL Chrome against the running frozen app.
 *
 *   npx cypress run --browser chrome \
 *     --spec "cypress/live-probes/live_chat_e2e.cy.js" \
 *     --config "baseUrl=http://127.0.0.1:5000,video=false,defaultCommandTimeout=90000,specPattern=cypress/live-probes/**\/*.cy.js"
 *
 * NOTE the specPattern override — it is REQUIRED. `--spec` must fall inside
 * specPattern, and this file deliberately lives outside cypress/e2e/ so CI
 * (which has no app on :5000) never runs it.
 *
 * WHY: a measured 09:10 "hi" turn took ~26s and played no audio, while
 * server.log showed TTS succeeding (wav published 13s after the text) and EVERY
 * broadcast_sse_event logging `clients=[], client_count=0`. Server logs prove
 * nobody was subscribed; only the browser can show whether it ever TRIED.
 *
 * FINDINGS ARE WRITTEN TO cypress/live-probes/_last_run.json, not cy.log —
 * `cypress run` does not surface cy.log to stdout, so a cy.log-only probe
 * produces a green run and no evidence, which is worse than no probe.
 */

const OUT = 'cypress/live-probes/_last_run.json';
const findings = {eventSources: [], webSockets: [], consoleErrors: []};

describe('live chat turn — real Chrome, frozen app', () => {
  it('instruments transports, sends "hi", and records what actually happens', () => {
    cy.visit('/local', {
      failOnStatusCode: false,
      onBeforeLoad(win) {
        // Instrument BEFORE app code runs so nothing is missed.
        const RealES = win.EventSource;
        if (RealES) {
          win.EventSource = function (url, cfg) {
            findings.eventSources.push(String(url));
            return new RealES(url, cfg);
          };
          win.EventSource.prototype = RealES.prototype;
        }
        const RealWS = win.WebSocket;
        win.WebSocket = function (url, protos) {
          findings.webSockets.push(String(url));
          return new RealWS(url, protos);
        };
        win.WebSocket.prototype = RealWS.prototype;
        const err = win.console.error;
        win.console.error = function (...a) {
          findings.consoleErrors.push(a.map(String).join(' ').slice(0, 200));
          return err.apply(this, a);
        };
      },
    });

    // Bundle gate — if this is not the built bundle, nothing below means anything.
    cy.window().then((win) => {
      findings.bundles = Array.from(win.document.querySelectorAll('script[src]'))
        .map((s) => s.getAttribute('src'))
        .filter((s) => /main\.[a-f0-9]+\.js$/.test(s));
      expect(findings.bundles, 'exactly one main bundle').to.have.length(1);
    });

    cy.wait(12000); // let the app establish whatever realtime it establishes

    // Count existing message-ish nodes BEFORE sending. The reply must be a NEW
    // node — matching /hi|hello/ would be satisfied by our own echoed message,
    // which is a guard that cannot fail for the defect it is meant to catch.
    cy.get('body').then(($b) => {
      findings.textLenBefore = $b.text().length;
    });

    cy.get('textarea, input[type="text"]').filter(':visible').first().as('composer');
    cy.get('@composer').then(() => {
      findings.sentAt = Date.now();
    });
    cy.get('@composer').type('hi{enter}', {force: true});

    // Wait for the page text to GROW by a meaningful amount — a real reply adds
    // characters beyond our 2-char echo. 40 chars is well above the echo.
    cy.get('body', {timeout: 150000})
      .should(($b) => {
        expect($b.text().length).to.be.greaterThan(findings.textLenBefore + 40);
      })
      .then(($b) => {
        findings.replySeconds = ((Date.now() - findings.sentAt) / 1000).toFixed(1);
        findings.textLenAfter = $b.text().length;
      });

    // TTS lands ~13s after the text server-side; give it room.
    cy.wait(35000);

    cy.document().then((doc) => {
      findings.audioEls = Array.from(doc.querySelectorAll('audio')).map(
        (a) => a.getAttribute('src') || a.currentSrc || '(no src)',
      );
      findings.ttsAudio = findings.audioEls.filter((s) => String(s).includes('/tts/audio/'));
    });

    cy.then(() => cy.writeFile(OUT, findings, {log: false}));
  });
});
