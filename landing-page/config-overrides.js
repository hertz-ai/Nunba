const webpack = require('webpack');

module.exports = function override(config) {
  // Add fallbacks for Node.js modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    stream: require.resolve('stream-browserify'),
    process: false,
    buffer: require.resolve('buffer/'),
    assert: require.resolve('assert/'),
    util: require.resolve('util/'),
  };

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);

  config.resolve.extensions = ['.js', '.jsx', '.json', '.ts', '.tsx'];

  // Istanbul code coverage instrumentation (only when CYPRESS_COVERAGE=true)
  if (process.env.CYPRESS_COVERAGE === 'true') {
    const babelLoader = config.module.rules
      .find((rule) => rule.oneOf)
      ?.oneOf?.find(
        (rule) =>
          rule.loader && rule.loader.includes('babel-loader') && rule.include
      );
    if (babelLoader) {
      babelLoader.options = babelLoader.options || {};
      babelLoader.options.plugins = babelLoader.options.plugins || [];
      babelLoader.options.plugins.push('istanbul');
    }
  }

  return config;
};
