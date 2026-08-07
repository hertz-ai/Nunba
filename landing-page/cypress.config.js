const {defineConfig} = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Retry once in CI — catches transient timing without 5hr runs
    retries: {
      runMode: 1,
      openMode: 0,
    },
    // React dev server on 3000, Flask backend on 5000
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 20000,
    requestTimeout: 60000,
    responseTimeout: 60000,
    video: false,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 5,

    // Mochawesome HTML report
    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
      reportDir: 'cypress/reports',
      charts: true,
      reportPageTitle: 'Nunba E2E Test Report',
      embeddedScreenshots: true,
      inlineAssets: true,
      overwrite: true,
      html: true,
      json: true,
    },

    setupNodeEvents(on, config) {
      // Fake media devices — Demopage AUTO-STARTS the microphone ~4s after
      // mount (the voice-first bootstrap poll, Demopage.js:516).  Against a
      // LIVE backend that getUserMedia raises Chrome's permission prompt,
      // which freezes the renderer: measured 2026-08-07, chat-agent-selection
      // + chat-llm-status wedged >45min mid-spec with 45s CDP timeouts.  The
      // fake flags auto-grant a synthetic mic so the prompt never exists.
      // Harmless in CI (stubbed backends never reach getUserMedia) and for
      // every other spec.
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--use-fake-ui-for-media-stream');
          launchOptions.args.push('--use-fake-device-for-media-stream');
        }
        return launchOptions;
      });

      // Mochawesome reporter
      require('cypress-mochawesome-reporter/plugin')(on);

      // Code coverage
      require('@cypress/code-coverage/task')(on, config);

      on('task', {
        log(message) {
          console.log('  [CY]', message);
          return null;
        },
      });

      return config;
    },
  },
});
