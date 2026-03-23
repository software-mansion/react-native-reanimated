/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {
  disableInlineStylesWarning: true,
  strictGlobal: true,
};

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/preset-typescript',
    'module:@react-native/babel-preset',
  ],
  plugins: [['react-native-worklets/plugin', workletsPluginOptions]],
};
