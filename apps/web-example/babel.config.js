/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {
  strictGlobal: true,
};

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
    console.log(
      'DISABLE_BABEL_PLUGIN env var:',
      process.env.DISABLE_BABEL_PLUGIN
    );
  } else {
    plugins.push(['react-native-worklets/plugin', workletsPluginOptions]);
  }

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Disable worklets and reanimated plugins from babel-preset-expo when DISABLE_BABEL_PLUGIN is set
          worklets: !disableBabelPlugin,
          reanimated: !disableBabelPlugin,
        },
      ],
      'react-strict-dom/babel-preset',
    ],
    plugins,
  };
};
