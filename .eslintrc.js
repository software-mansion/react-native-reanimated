module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
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
    'import/no-unresolved': 'error',
    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'react/jsx-uses-vars': 'error',
    'react/jsx-uses-react': 'error',
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': 'off', // TODO consider enabling this (currently it reports styles defined at the bottom of the file)
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
      },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-var-requires': 'warn',
    // '@typescript-eslint/no-duplicate-type-constituents': 'error', // TODO this currently breaks ESLint for VSCode in plugin
    eqeqeq: 'error',
    'no-unreachable': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' },
    ],
    '@typescript-eslint/consistent-type-exports': [
      'error',
      { fixMixedExportsWithInlineTypeSpecifier: false },
    ],
  },
};
