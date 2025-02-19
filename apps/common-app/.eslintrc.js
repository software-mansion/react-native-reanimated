/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  root: true,
  extends: ['@react-native', 'prettier', '../../.eslintrc.js'],
  plugins: ['eslint-plugin-no-inline-styles', 'eslint-plugin-reanimated'],
  ignorePatterns: ['**/*.snapshot.ts'],
  rules: {
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-shadow': 'off',
    'no-inline-styles/no-inline-styles': 'error',
    'react-native/no-inline-styles': 'off',
    'react-native/no-unused-styles': 'error',
    'react-native/no-raw-text': 'off', // This rule is great, we don't enable it because of its performance. If we ever find similar rule we should enable it.
    'react-native/no-single-element-style-arrays': 'error',
    'reanimated/animated-style-non-animated-component': 'error',
    'react/jsx-fragments': ['error', 'syntax'],
  },
  overrides: [
    {
      files: ['./src/apps/reanimated/examples/RuntimeTests/tests/**'],
      rules: {
        'no-template-curly-in-string': 'off',
        'no-inline-styles/no-inline-styles': 'off',
      },
    },
  ],
};
