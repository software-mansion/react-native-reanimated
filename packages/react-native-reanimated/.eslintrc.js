/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['./src/**/*.ts', './src/**/*.tsx'],
      excludedFiles: [
        './src/worklets/**/*.ts',
        './src/worklets/**/*.tsx',
        './src/WorkletsResolver/**/*.ts',
        './src/WorkletsResolver/**/*.tsx',
      ],
      plugins: ['reanimated'],
      rules: {
        'reanimated/use-reanimated-error': 'error',
        'reanimated/use-worklets-resolver': 'error',
      },
    },
  ],
  ignorePatterns: ['lib'],
};
