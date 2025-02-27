/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['./src/**/*.ts', './src/**/*.tsx'],
      plugins: ['reanimated'],
      rules: {
        'reanimated/use-reanimated-error': 'error',
      },
    },
  ],
  ignorePatterns: ['lib', 'plugin'],
};
