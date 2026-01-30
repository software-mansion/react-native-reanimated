// This file is needed for manual tests of the plugin.
const workletsPlugin = require('./index.js');

/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletsPluginOptions = {};

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['@babel/preset-typescript'],
  plugins: [[workletsPlugin, workletsPluginOptions]],
};
