/* eslint-disable */
// Webpack override for the React SPA build.
//
// `CYPRESS_COVERAGE=true` OR `NUNBA_INSTRUMENT=1` turns on
// babel-plugin-istanbul so `window.__coverage__` is populated at
// runtime.  The @cypress/code-coverage plugin ships that object
// back to the nyc reporter after each Cypress run.  Production
// builds do NOT set either var — zero instrumentation cost in
// shipped bundles.
function override(config) {
  config.resolve = config.resolve || {};
  config.resolve.fallback = {
    ...config.resolve.fallback,
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer/"),
  };

  const instrument =
    process.env.CYPRESS_COVERAGE === "true" ||
    process.env.NUNBA_INSTRUMENT === "1";

  if (instrument) {
    // Inject babel-plugin-istanbul into every babel-loader rule.
    const babelLoaderPredicate = (rule) =>
      rule && rule.loader && /babel-loader/.test(rule.loader);

    const injectIstanbul = (loader) => {
      loader.options = loader.options || {};
      loader.options.plugins = loader.options.plugins || [];
      const alreadyAdded = loader.options.plugins.some((p) => {
        const name = Array.isArray(p) ? p[0] : p;
        return typeof name === "string" && name.includes("istanbul");
      });
      if (!alreadyAdded) {
        loader.options.plugins.push([
          require.resolve("babel-plugin-istanbul"),
          {
            // Do NOT instrument vendor code or tests themselves.
            exclude: [
              "node_modules/**",
              "**/*.test.js",
              "**/*.test.jsx",
              "cypress/**",
              "src/serviceWorker.js",
              "src/setupTests.js",
            ],
          },
        ]);
      }
    };

    const walkRules = (rules) => {
      if (!Array.isArray(rules)) return;
      for (const rule of rules) {
        if (babelLoaderPredicate(rule)) {
          injectIstanbul(rule);
        }
        if (rule && rule.use) {
          const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
          for (const u of uses) {
            if (babelLoaderPredicate(u)) {
              injectIstanbul(u);
            }
          }
        }
        if (rule && rule.oneOf) {
          walkRules(rule.oneOf);
        }
      }
    };

    if (config.module && config.module.rules) {
      walkRules(config.module.rules);
    }
  }

  return config;
}

module.exports = {
  webpack: override,
  jest: (config) => {
    /* CRA sets resetMocks: true, which strips the implementation from every
     * jest.fn() before each test -- not just the recorded calls. A manual
     * mock cannot then supply a working default: src/services/__mocks__/
     * socialApi.js hands out functions that resolve to { data: [] }, and
     * resetMocks turns each of them back into a function returning undefined
     * before the first test runs, so any component calling .then() on the
     * result crashes. That is exactly how it failed here: SocialLayout's
     * leaderboard fetch died on "Cannot read properties of undefined
     * (reading 'then')" in all 54 assertions.
     *
     * Every suite that needs isolation already calls jest.clearAllMocks() in
     * its own beforeEach, which clears recorded calls between tests and is
     * what those files actually rely on; the reset only removed defaults
     * nothing had asked it to remove. Ported from Hevolve web, which hit the
     * same wall when its manual mock landed.
     *
     * This file exported a bare function before, which react-app-rewired
     * treats as the webpack override alone -- there was no jest hook to put
     * this in. */
    config.resetMocks = false;
    return config;
  },
};
