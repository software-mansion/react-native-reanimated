const { defineConfig, globalIgnores } = require('eslint/config');
const baseConfig = require('../../eslint.config.js');

const reanimated = require('eslint-plugin-reanimated');

module.exports = defineConfig([
  {
    extends: [baseConfig],
  },
  {
    files: ['./src/**/*.ts', './src/**/*.tsx'],
    plugins: {
      reanimated,
    },
    rules: {
      'reanimated/use-reanimated-error': 'error',
      'reanimated/use-global-this': 'error',
    },
  },
  globalIgnores(['**/lib', '**/plugin']),
]);

console.log(module.exports);
