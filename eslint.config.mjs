import jsEslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import reactNative from 'eslint-plugin-react-native';
import jest from 'eslint-plugin-jest';
import globals from 'globals';
import reanimated from 'eslint-plugin-reanimated';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import nodePlugin from 'eslint-plugin-n';

/** @type {import('eslint').Linter.RulesRecord} */
const tsRules = {
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-empty-object-type': 'warn',

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

  'no-empty': 'warn',
};

/** @type {import('eslint').Linter.RulesRecord} */
const jsDocRules = {
  'jsdoc/tag-lines': 'off',
  'jsdoc/require-param-description': 'off',
  'jsdoc/require-returns-description': 'off',
  'jsdoc/require-jsdoc': 'off',
};

/** @type {import('eslint').Linter.RulesRecord} */
const importRules = {
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'import/first': 'error',
  'import/newline-after-import': 'error',
  'import/no-duplicates': 'error',
};

/** @type {import('eslint').Linter.RulesRecord} */
const nodeRules = {
  'n/no-missing-import': 'off',
  'n/no-unpublished-import': 'warn',
  'n/no-unpublished-require': 'warn',
  'n/no-extraneous-import': 'warn',
  'n/no-extraneous-require': 'warn',
  'n/no-unsupported-features/node-builtins': 'warn',
};

/** @type {import('eslint').Linter.RulesRecord} */
const tsDocRules = {
  'tsdoc/syntax': 'error',
};

/** @type {import('eslint').Linter.Plugins} */
const tsPlugins = {
  tsdoc,
  'simple-import-sort': simpleImportSort,
};

const tsCommonExtends = [
  tsEslint.configs.recommendedTypeChecked,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs['recommended-latest'],
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  nodePlugin.configs['flat/recommended-script'],
];

/** @type {import('eslint').Linter.Config} */
const tsCommonConfig = {
  extends: tsCommonExtends,
  plugins: {
    ...tsPlugins,
    reanimated,
  },
  rules: {
    ...tsRules,
    ...nodeRules,
    'reanimated/use-reanimated-error': 'error',
    'reanimated/use-global-this': 'error',
  },
  ignores: ['**/node_modules/**'],
};

/** @type {import('eslint').Linter.Config[]} */
const reanimatedConfig = [
  {
    files: ['**/react-native-reanimated/**/*.ts'],
    ...tsCommonConfig,
  },
  {
    files: ['**/react-native-reanimated/**/*.js'],
    plugins: {
      reanimated,
    },
    rules: {
      'reanimated/use-reanimated-error': 'error',
      'reanimated/use-global-this': 'error',
    },
  },
];

/** @type {import('eslint').Linter.Config[]} */
const workletsConfig = [
  {
    files: ['**/react-native-worklets/**/*.ts'],
    ...tsCommonConfig,
  },
  {
    files: ['**/react-native-worklets/**/*.js'],
    plugins: {
      reanimated,
    },
    rules: {
      'reanimated/use-reanimated-error': 'error',
      'reanimated/use-global-this': 'error',
    },
  },
];

/** @type {import('eslint').Linter.Config[]} */
export default tsEslint.config(
  jsEslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        React: true,
        ...reactNative.environments['react-native']['react-native'],
        ...jest.environments.globals.globals,
        ...globals.node,
      },
    },
    plugins: {
      'react-native': reactNative,
      jest,
    },
    settings: {
      'import/resolver': {
        'babel-module': { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
      react: {
        version: 'detect',
      },
      'import/ignore': ['react-native'],
    },
  },
  ...reanimatedConfig,
  ...workletsConfig,
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
    },
  },

  {
    files: ['**/*.js', '**/*.jsx'],
    extends: [jsdoc.configs['flat/recommended']],
    plugins: { jsdoc },
    rules: {
      ...jsDocRules,
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
    '**/eslint-plugin-reanimated/types/**',
    '**/packages/docs-reanimated/**',
    '**/apps/common-app/src/types/**',
  ])
);
