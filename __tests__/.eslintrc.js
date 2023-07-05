module.exports = {
  root: true,
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:import/typescript',
  ],
  plugins: ['react', 'react-native', 'import', 'jest', '@typescript-eslint'],
  env: {
    'react-native/react-native': true,
    'jest/globals': true,
  },
  settings: {
    'import/resolver': {
      'babel-module': {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
  },
};
