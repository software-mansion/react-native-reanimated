const stylexPlugin = require('@stylexjs/babel-plugin');
const rsdPlugin = require('react-strict-dom/babel');

/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  const plugins = [
    rsdPlugin,
    [
      stylexPlugin,
      {
        importSources: [
          '@stylexjs/stylex',
          { from: 'react-strict-dom', as: 'css' },
        ],
        runtimeInjection: true,
      },
    ],
    [
      'module-resolver',
      {
        alias: {
          '@': '../common-app/src',
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],
  ];

  const disableBabelPlugin = process.env.DISABLE_BABEL_PLUGIN === '1';
  // https://babeljs.io/docs/en/config-files#apicache
  api.cache.invalidate(() => disableBabelPlugin);
  if (disableBabelPlugin) {
    console.log('Starting Web example without Babel plugin.');
  } else {
    plugins.push('react-native-reanimated/plugin');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
