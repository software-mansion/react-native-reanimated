/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  root: true,
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
      plugins: ['tsdoc', 'simple-import-sort'],
      extends: ['plugin:@typescript-eslint/recommended-type-checked'],
      rules: {
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/ban-ts-comment': [
          'error',
          {
            'ts-ignore': 'allow-with-description',
            'ts-expect-error': 'allow-with-description',
          },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-var-requires': 'warn',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports' },
        ],
        '@typescript-eslint/consistent-type-exports': [
          'error',
          { fixMixedExportsWithInlineTypeSpecifier: false },
        ],
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-duplicate-type-constituents': 'error',
        '@typescript-eslint/no-shadow': 'error',
        'tsdoc/syntax': 'error',
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
      },
    },
    {
      files: ['*.js', '*.jsx'],
      plugins: ['jsdoc'],
      extends: ['plugin:jsdoc/recommended'],
      rules: {
        'jsdoc/tag-lines': 'off',
        'jsdoc/require-param-description': 'off',
      },
    },
  ],
  parserOptions: {
    requireConfigFile: false,
  },
  extends: [
    'standard',
    'prettier',
    'plugin:import/typescript',
    'plugin:react-hooks/recommended',
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
    'object-shorthand': 'error',
    curly: ['error', 'all'],
    'no-case-declarations': 'error',
    'import/no-unresolved': 'error',
    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'react/jsx-uses-vars': 'error',
    'react/jsx-uses-react': 'error',
    'no-use-before-define': 'off',
    eqeqeq: 'error',
    'no-unreachable': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    'react/react-in-jsx-scope': 'off',
  },
};
