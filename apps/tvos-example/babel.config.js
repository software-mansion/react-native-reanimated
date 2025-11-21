/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletOptions = {};

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [['react-native-worklets/plugin', workletOptions]],
};
