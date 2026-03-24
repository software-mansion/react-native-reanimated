/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  // Use only @react-native/babel-preset which already includes
  // @babel/preset-env and @babel/preset-typescript.
  // The main babel.config.js has all three which adds redundant overhead.
  presets: ['module:@react-native/babel-preset'],
  plugins: [['./plugin', { disableInlineStylesWarning: true }]],
};
