module.exports = {
  root: true,
  extends: ['@react-native', 'prettier', '../.eslintrc.js'],
  plugins: ['jest', 'detox'],
  env: {
    jest: true,
  },
};
