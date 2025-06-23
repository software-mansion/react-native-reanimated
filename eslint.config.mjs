import jsEslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
// @ts-ignore no types for this plugin
import reactNative from 'eslint-plugin-react-native';
import jest from 'eslint-plugin-jest';
// @ts-ignore no types for this plugin
import globals from 'globals';
// @ts-ignore no types for this plugin
import reanimated from 'eslint-plugin-reanimated';
// @ts-ignore no types for this plugin
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import nodePlugin from 'eslint-plugin-n';
// @ts-ignore no types for this plugin
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
  'react/jsx-uses-react': 'error',
};

/** @type {import('typescript-eslint').ConfigWithExtends['rules']} */
const jsDocRules = {
  'jsdoc/tag-lines': 'off',
  'jsdoc/require-param-description': 'off',
  'jsdoc/require-returns-description': 'off',
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
  'n/no-extraneous-import': 'warn',
  'n/no-extraneous-require': 'warn',
  'n/no-unsupported-features/node-builtins': 'warn',
};

/** @type {import('typescript-eslint').ConfigWithExtends['rules']} */
const tsDocRules = {
  'tsdoc/syntax': 'error',
};

/** @type {import('typescript-eslint').ConfigWithExtends['plugins']} */
const tsPlugins = {
  tsdoc,
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

/** @type {import('typescript-eslint').ConfigWithExtends} */
const tsCommonConfig = {
  extends: tsCommonExtends,
  plugins: {
    ...tsPlugins,
    reanimated,
    'simple-import-sort': simpleImportSort,
  },
  rules: {
    ...tsRules,
    ...nodeRules,
    'reanimated/use-reanimated-error': 'error',
    'reanimated/use-global-this': 'error',
  },
};

/** @type {import('typescript-eslint').ConfigWithExtends[]} */
const reanimatedConfig = [
  {
    files: [
      '**/react-native-reanimated/**/*.ts',
      '**/react-native-reanimated/**/*.tsx',
      '**/react-native-worklets/**/*.ts',
      '**/react-native-worklets/**/*.tsx',
    ],
    ...tsCommonConfig,
  },
  {
    files: [
      '**/react-native-reanimated/**/*.js',
      '**/react-native-worklets/**/*.js',
    ],
    plugins: {
      reanimated,
    },
    rules: {
      'reanimated/use-reanimated-error': 'error',
      'reanimated/use-global-this': 'error',
    },
  },
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
      'react-native': fixupPluginRules(reactNative),
      jest,
    },
    settings: {
      'import/resolver': {
        'babel-module': { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
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
  ...reanimatedConfig,
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
    // @ts-ignore
    extends: [jsdoc.configs['flat/recommended']],
    plugins: { jsdoc },
    rules: {
      ...jsDocRules,
      'no-unused-vars': 'off',
    },
  },
  // @ts-ignore
  globalIgnores([
    '**/build/**',
    '**/coverage/**',
    '**/dist/**',
    '**/ios/**',
    '**/android/**',
    '**/lib/**',
    '**/plugin/**',
    '**/eslint-plugin-reanimated/types/**',
    '**/packages/docs-reanimated/**',
    '**/apps/common-app/src/types/**',
  ])
);

export default config;
