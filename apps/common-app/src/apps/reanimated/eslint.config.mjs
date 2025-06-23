import jsEslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
// @ts-expect-error
import reactNative from 'eslint-plugin-react-native';
import { fixupPluginRules } from '@eslint/compat';
import { globalIgnores } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
// @ts-expect-error
import reanimated from 'eslint-plugin-reanimated';
// @ts-expect-error
import noInlineStyles from 'eslint-plugin-no-inline-styles';
import react from 'eslint-plugin-react';

/** @type {import('typescript-eslint').ConfigWithExtends[]} */
export default tsEslint.config(
  jsEslint.configs.recommended,
  {
    // @ts-expect-error
    extends: [eslintPluginPrettierRecommended, react.configs.flat.recommended],
    languageOptions: {
      globals: {
        React: true,
      },
      parserOptions: {
        parser: tsEslint.parser,
        project: '../../../tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'no-inline-styles': noInlineStyles,
      'react-native': fixupPluginRules(reactNative),
      reanimated: reanimated,
    },
    rules: {
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      'no-inline-styles/no-inline-styles': 'error',
      'react-native/no-inline-styles': 'off',
      'react-native/no-raw-text': 'off', // This rule is great, we don't enable it because of its performance. If we ever find similar rule we should enable it.
      'react-native/no-single-element-style-arrays': 'error',
      'react-native/no-unused-styles': 'error',
      'react/jsx-fragments': ['error', 'syntax'],
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'reanimated/animated-style-non-animated-component': 'error',
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: '../../../tsconfig.json',
        },
      },
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tsEslint.configs.recommendedTypeChecked],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-constant-condition': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      'no-underscore-dangle': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'no-inline-styles/no-inline-styles': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  globalIgnores(['**/*.snapshot.ts', '**/*.prettierrc.js'])
);
