/** @type {import('./plugin').PluginOptions} */
const workletsPluginOptions = {
  strictGlobal: true,
  disableInlineStylesWarning: true,
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
    '@react-native/babel-preset',
  ],
  plugins: [['./plugin', workletsPluginOptions]],
};
