/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['./src/**/*.ts', './src/**/*.tsx'],
      plugins: ['reanimated', '@ericcornelissen/top'],
      rules: {
        'reanimated/use-worklets-error': 'error',
        'reanimated/use-global-this': 'error',
        '@ericcornelissen/top/no-top-level-side-effects': 'error',
        '@ericcornelissen/top/no-top-level-variables': 'error'
      },
    },
  ],
  ignorePatterns: ['lib'],
};
