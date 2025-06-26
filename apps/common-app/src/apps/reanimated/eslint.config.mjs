import jsEslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import reactNative from 'eslint-plugin-react-native';
import { fixupPluginRules } from '@eslint/compat';
import { globalIgnores } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reanimated from 'eslint-plugin-reanimated';
import noInlineStyles from 'eslint-plugin-no-inline-styles';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/** @type {import('typescript-eslint').ConfigWithExtends[]} */
export default tsEslint.config(
  jsEslint.configs.recommended,
  react.configs.flat.recommended,
  eslintPluginPrettierRecommended,
  reactHooks.configs['recommended-latest'],
  {
    languageOptions: {
      globals: {
        React: true,
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
      'no-new-wrappers': 'error',
      'reanimated/animated-style-non-animated-component': 'error',
      'prefer-regex-literals': 'error',
      'no-bitwise': 'error',
      'no-useless-constructor': 'error',
      'symbol-description': 'error',
      'no-void': 'error',
      'no-var': 'error',
      'no-unused-expressions': 'error',
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
    languageOptions: {
      parserOptions: {
        project: '../../../tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
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
