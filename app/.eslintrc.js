module.exports = {
  root: true,
  extends: '@react-native',
  plugins: ['eslint-plugin-no-inline-styles'],
  rules: {
    'no-inline-styles/no-inline-styles': 'error',
    'react-native/no-inline-styles': 'off',
    '@typescript-eslint/no-shadow': 'off',
    'react-native/no-unused-styles': 'error',
    'react-native/no-raw-text': 'off',
    'react-native/no-single-element-style-arrays': 'error',
  },
};
