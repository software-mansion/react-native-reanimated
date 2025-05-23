import { defineConfig, globalIgnores } from 'eslint/config';
import tsParser from '@typescript-eslint/parser';
import tsdoc from 'eslint-plugin-tsdoc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import jsdoc from 'eslint-plugin-jsdoc';
import {
  fixupConfigRules,
  fixupPluginRules,
  // includeIgnoreFile,
} from '@eslint/compat';
import react from 'eslint-plugin-react';
import reactNative from 'eslint-plugin-react-native';
import _import from 'eslint-plugin-import';
import jest from 'eslint-plugin-jest';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    languageOptions: {
      parserOptions: {
        requireConfigFile: false,
      },

      globals: {
        ...reactNative.environments['react-native']['react-native'],
        ...jest.environments.globals.globals,
      },
    },

    extends: fixupConfigRules(
      compat.extends(
        'standard',
        'prettier',
        'plugin:import/typescript',
        'plugin:react-hooks/recommended'
      )
    ),

    plugins: {
      react,
      'react-native': reactNative,
      import: fixupPluginRules(_import),
      jest,
      '@typescript-eslint': typescriptEslint,
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
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      parser: tsParser,

      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },

    plugins: {
      tsdoc,
      'simple-import-sort': simpleImportSort,
    },

    extends: compat.extends(
      'plugin:@typescript-eslint/recommended-type-checked'
    ),

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
        },
      ],

      '@typescript-eslint/no-var-requires': 'warn',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],

      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: false,
        },
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

    plugins: {
      'eslint-plugin-jsdoc': jsdoc,
    },

    extends: compat.extends('plugin:jsdoc/recommended'),

    rules: {
      'jsdoc/tag-lines': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
  },
  globalIgnores([
    '**/build',
    '**/.yarn',
    '**/ios',
    '**/macos',
    '**/vendor',
    'apps/common-app/**/*.snapshot.ts',
    'packages/react-native-worklets/plugin/lib',
    'packages/react-native-worklets/plugin/index.js',
    'packages/react-native-worklets/plugin/index.js.map',
  ]),
]);
