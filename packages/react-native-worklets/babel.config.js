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
  plugins: [['./plugin', { disableInlineStylesWarning: true }]],
};
