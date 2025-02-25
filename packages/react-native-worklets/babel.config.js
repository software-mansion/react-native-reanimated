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
    'module:react-native-builder-bob/babel-preset',
  ],
  plugins: [['./plugin', { disableInlineStylesWarning: true }]],
};
