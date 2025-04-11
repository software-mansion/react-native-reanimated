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
  plugins: [
    ['react-native-worklets/plugin', { disableInlineStylesWarning: true }],
  ],
};
