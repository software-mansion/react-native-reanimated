module.exports = {
  extends: [
    'standard',
    'prettier',
    'prettier/flowtype',
    'prettier/react',
    'prettier/standard',
  ],
  plugins: ['react', 'react-native', 'import', 'jest', 'prettier'],
  env: {
    'react-native/react-native': true,
    'jest/globals': true,
  },
  rules: {
    'import/no-unresolved': 2,
    'react/jsx-uses-vars': 2,
    'react/jsx-uses-react': 2,
  },
  overrides: [
    {
      files: ['*.js'],
      parser: 'babel-eslint',
    },
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint/eslint-plugin'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_' },
        ],

        'no-dupe-class-members': 'off',
        'no-unused-vars': 'off',
      },
    },
  ],
}
