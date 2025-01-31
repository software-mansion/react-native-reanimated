/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['./src/**/*.ts', './src/**/*.tsx'],
      plugins: ['reanimated'],
      rules: {
        // TODO: Add `use-worklets-error` rule.
      },
    },
  ],
  ignorePatterns: ['lib'],
};
