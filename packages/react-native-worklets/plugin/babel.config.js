// This file is needed for manual tests of the plugin.
const reanimatedPlugin = require('./index.js');

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  plugins: [reanimatedPlugin],
};
