module.exports = {
  root: true,
  extends: '@react-native',
  plugins: ['eslint-plugin-no-inline-styles', 'reanimated'],
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
};
