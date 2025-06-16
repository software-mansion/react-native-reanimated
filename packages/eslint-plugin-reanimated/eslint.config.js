const { defineConfig, globalIgnores } = require('eslint/config');
const baseConfig = require('../../eslint.config.js');

module.exports = defineConfig([
  {
    extends: [baseConfig],
  },
  globalIgnores(['**/index.js', '**/types', '**/public']),
]);
