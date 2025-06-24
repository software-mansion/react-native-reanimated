/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['./src/**/*.ts', './src/**/*.tsx'],
      plugins: ['reanimated'],
      rules: {
        'reanimated/use-reanimated-error': 'error',
        'reanimated/use-logger': 'error',
        'reanimated/no-logger-message-prefix': 'error',
        'reanimated/use-global-this': 'error',
      },
    },
  ],
  ignorePatterns: ['lib', 'plugin'],
};
