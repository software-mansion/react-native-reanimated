const { defineConfig, globalIgnores } = require('eslint/config');

const tsParser = require('@typescript-eslint/parser');
const tsdoc = require('eslint-plugin-tsdoc');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const jsdoc = require('eslint-plugin-jsdoc');

const { fixupPluginRules } = require('@eslint/compat');

const react = require('eslint-plugin-react');
const reactNative = require('eslint-plugin-react-native');
const _import = require('eslint-plugin-import');
const jest = require('eslint-plugin-jest');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const js = require('@eslint/js');
const standard = require('eslint-config-standard');
const prettier = require('eslint-config-prettier');
const reactHooks = require('eslint-plugin-react-hooks');
const n = require('eslint-plugin-n');

module.exports = defineConfig([
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        requireConfigFile: false,
      },

      globals: {
        ...reactNative.environments['react-native']['react-native'],
        ...jest.environments.globals.globals,
        React: true,
      },
    },
    extends: [js.configs.recommended],

    plugins: {
      react,
      'react-native': reactNative,
      import: fixupPluginRules(_import),
      jest,
      '@typescript-eslint': typescriptEslint,
      'react-hooks': reactHooks,
      prettier: prettier,
      standard: standard,
      n,
    },

    settings: {
      'import/resolver': {
        'babel-module': { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
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
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-loss-of-precision': 'off',
      'no-empty': 'off',
      eqeqeq: 'error',
      'no-unreachable': 'error',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      parser: tsParser,
      parserOptions: { project: true, tsconfigRootDir: __dirname },
    },

    plugins: { tsdoc, 'simple-import-sort': simpleImportSort },

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
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
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
    files: ['**/*.js', '**/*.jsx'],

    plugins: { jsdoc },

    rules: {
      'jsdoc/tag-lines': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
  },
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/dist/**',
    '**/build/**',
    '**/ios/**',
    '**/android/**',
    '**/coverage/**',
    '**/lib/**',
    '**/plugin/**',
    'eslint.config.js',
    // TODO: remove this once we have a proper eslint config for each package and app
    '**/apps/**',
    '**/packages/docs-reanimated/**',
  ]),
]);
