/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  plugins: [['react-native-worklets/plugin', { processNestedWorklets: true }]],
};
