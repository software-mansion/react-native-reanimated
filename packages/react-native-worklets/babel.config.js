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
    'module:react-native-builder-bob/babel-preset',
  ],
  plugins: [['./plugin', { disableInlineStylesWarning: true }]],
};
