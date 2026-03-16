const {defineConfig} = require('cypress');

module.exports = defineConfig({
  e2e: {
    // React dev server on 3000, Flask backend on 5000
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 15000,
    requestTimeout: 20000,
    responseTimeout: 20000,
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
