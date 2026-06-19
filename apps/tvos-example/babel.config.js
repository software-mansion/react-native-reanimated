/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {
  strictGlobal: true,
  bundleMode: false,
};

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [['react-native-worklets/plugin', workletsPluginOptions]],
};
