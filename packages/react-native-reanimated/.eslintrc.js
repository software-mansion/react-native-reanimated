module.exports = {
  extends: ['../../.eslintrc.js'],
  plugins: ['eslint-plugin-reanimated'],
  ignorePatterns: ['lib'],
  rules: {
    'reanimated/use-reanimated-error': 'error',
  },
};
