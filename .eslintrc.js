module.exports = {
  parser: 'babel-eslint',
  extends: [
    'standard',
    'prettier',
    'prettier/flowtype',
    'prettier/react',
    'prettier/standard',
  ],
  plugins: ['react', 'react-native', 'import'],
  env: {
    'react-native/react-native': true,
  },
  rules: {
    'import/no-unresolved': 2,
  },
};
