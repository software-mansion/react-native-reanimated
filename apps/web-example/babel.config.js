/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {};

/** @type {import('@babel/core').ConfigFunction} */
module.exports = function (api) {
  const plugins = [
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
    plugins.push(['react-native-worklets/plugin', workletsPluginOptions]);
  }

  return {
    presets: ['babel-preset-expo', 'react-strict-dom/babel-preset'],
    plugins,
  };
};
