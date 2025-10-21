const stylexPlugin = require('@stylexjs/babel-plugin');
const rsdPreset = require('react-strict-dom/babel-preset');

/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  const plugins = [
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
    plugins.push('react-native-worklets/plugin');
  }

  return {
    presets: ['babel-preset-expo', rsdPreset],
    plugins,
  };
};
