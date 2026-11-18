/* eslint-disable */
// Webpack override for the React SPA build.
//
// `CYPRESS_COVERAGE=true` OR `NUNBA_INSTRUMENT=1` turns on
// babel-plugin-istanbul so `window.__coverage__` is populated at
// runtime.  The @cypress/code-coverage plugin ships that object
// back to the nyc reporter after each Cypress run.  Production
// builds do NOT set either var — zero instrumentation cost in
// shipped bundles.
//
// A production build needs REACT_APP_SECRET_KEY: it is the key the page
// reads every stored sign-in with (src/utils/encryption.js).  Without it
// the bundle cannot tell who is signed in and runs as the placeholder
// 'guest'.  On 2026-11-01 such a bundle (built without prebuild, which is
// what puts .env.local in place) went onto the desktop: the page wrote
// 'guest' over the owner's sign-in record, every consent ask went to
// 'guest', and the owner's answers never cleared them.  `npm run build`
// runs prebuild; a bare `react-app-rewired build` does not.
function requireSignInKey(env) {
  if (env === "production" && !process.env.REACT_APP_SECRET_KEY) {
    throw new Error(
      "REACT_APP_SECRET_KEY is not set, so this bundle could not read " +
        "anyone's sign-in. Build with `npm run build` (its prebuild " +
        "writes .env.local) or set the variable."
    );
  }
}

function override(config, env) {
  requireSignInKey(env);
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
  // `npm test` runs react-app-rewired, which adds package.json's jest lists
  // to CRA's defaults instead of replacing them.  CRA's default skips every
  // node_modules file, so package.json's exception for uuid never applied
  // and every suite that imports uuid failed to load.  CI's
  // `react-scripts test` replaces the list; this makes `npm test` do the
  // same.  The list itself stays in package.json, which both runners read.
  jest: (config) => {
    const { transformIgnorePatterns } = require("./package.json").jest;
    config.transformIgnorePatterns = transformIgnorePatterns;
    return config;
  },
};
