import jsEslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
// @ts-expect-error No types for eslint-plugin-react-native.
import reactNative from 'eslint-plugin-react-native';
import jest from 'eslint-plugin-jest';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import nodePlugin from 'eslint-plugin-n';
// @ts-expect-error No types for eslint-plugin-promise.
import pluginPromise from 'eslint-plugin-promise';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { fixupPluginRules } from '@eslint/compat';

/** @type {import('typescript-eslint').ConfigWithExtends['rules']} */
const tsRules = {
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-empty-object-type': 'warn',
  '@typescript-eslint/unbound-method': 'error',

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

  '@typescript-eslint/no-var-requires': 'error',

  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
  ],

  '@typescript-eslint/consistent-type-exports': [
    'error',
    { fixMixedExportsWithInlineTypeSpecifier: true },
  ],

  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-duplicate-type-constituents': 'error',
  '@typescript-eslint/no-shadow': 'error',
  '@typescript-eslint/no-redundant-type-constituents': 'error',

  'no-empty': 'warn',
  'react/jsx-uses-react': 'error',
  camelcase: 'error',
};

/** @type {import('typescript-eslint').ConfigWithExtends['rules']} */
const jsDocRules = {
  'jsdoc/tag-lines': 'off',
  'jsdoc/require-param-description': 'off',
  'jsdoc/require-returns-description': 'off',
  'jsdoc/require-jsdoc': 'off',
};

/** @type {import('typescript-eslint').ConfigWithExtends['rules']} */
const importRules = {
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'import/first': 'error',
  'import/newline-after-import': 'error',
  'import/no-duplicates': 'error',
};

/** @type {import('typescript-eslint').ConfigWithExtends['rules']} */
const nodeRules = {
  'n/no-missing-import': 'off',
  'n/no-unpublished-import': 'warn',
  'n/no-unpublished-require': 'warn',
  'n/no-extraneous-import': 'off',
  'n/no-extraneous-require': 'off',
  'n/no-unsupported-features/node-builtins': [
    'error',
    {
      version: '>=21.1.0',
      allowExperimental: true,
    },
  ],
};

/** @type {import('typescript-eslint').ConfigWithExtends['rules']} */
const tsDocRules = {
  'tsdoc/syntax': 'error',
};

/** @type {import('typescript-eslint').ConfigWithExtends['extends']} */
const tsCommonExtends = [
  tsEslint.configs.recommendedTypeChecked,
  reactHooks.configs['recommended-latest'],
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  nodePlugin.configs['flat/recommended-script'],
  eslintPluginPrettierRecommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
];

/**
 * @type {(
 *   | import('typescript-eslint').ConfigWithExtends
 *   | import('eslint').Linter.Config
 * )[]}
 */
const config = tsEslint.config(
  jsEslint.configs.recommended,
  eslintConfigPrettier,
  pluginPromise.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.json'],
      },
    },
  },
  {
    languageOptions: {
      globals: {
        React: true,
        ...reactNative.environments['react-native']['react-native'],
        ...jest.environments.globals.globals,
        ...globals.node,
      },
    },
    plugins: {
      'react-native': fixupPluginRules(reactNative),
      jest,
    },
    settings: {
      'import/resolver': {
        'babel-module': {
          extensions: [
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.native.js',
            '.native.jsx',
            '.native.ts',
            '.native.tsx',
          ],
        },
      },
      react: {
        version: 'detect',
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/ignore': ['react-native'],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: tsCommonExtends,
    plugins: {
      tsdoc,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...tsRules,
      ...jsDocRules,
      ...importRules,
      ...nodeRules,
      ...tsDocRules,
      'react-hooks/exhaustive-deps': 'error',
      'no-eval': 'error',
      'no-var': 'error',
    },
  },

  {
    files: ['**/*.js', '**/*.jsx'],
    extends: [jsdoc.configs['flat/recommended']],
    plugins: { jsdoc },
    rules: {
      ...jsDocRules,
      'no-unused-vars': 'off',
    },
  },
  globalIgnores([
    '**/build/**',
    '**/coverage/**',
    '**/dist/**',
    '**/ios/**',
    '**/android/**',
    '**/lib/**',
    '**/.next/**',
    '**/macos/**',
    '**/.worklets/**',
  ])
);

export default config;
