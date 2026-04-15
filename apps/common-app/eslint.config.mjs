import { fixupPluginRules } from '@eslint/compat';
import jsEslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import perfectionist from 'eslint-plugin-perfectionist';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
// eslint-disable-next-line import/default
import reactHooks from 'eslint-plugin-react-hooks';
// @ts-expect-error eslint-plugin-react-native has no types.
import reactNative from 'eslint-plugin-react-native';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import { config, configs, parser } from 'typescript-eslint';

/** @type {import('typescript-eslint').ConfigWithExtends[]} */
export default config(
  jsEslint.configs.recommended,
  react.configs.flat.recommended,
  importPlugin.flatConfigs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      parserOptions: {
        parser: parser,
        project: [
          './tsconfig.json',
          './tsconfig.web.json',
          './../../tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    languageOptions: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      globals: {
        React: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ...reactNative.environments['react-native']['react-native'],
        ...globals.node,
      },
    },
    plugins: {
      'no-relative-import-paths': noRelativeImportPaths,
      perfectionist,
      'react-hooks': reactHooks,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      'react-native': fixupPluginRules(reactNative),
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      camelcase: [
        'error',
        {
          allow: [],
          ignoreDestructuring: false,
          ignoreGlobals: false,
          ignoreImports: false,
          properties: 'always',
        },
      ],
      'comma-dangle': ['off'],
      'consistent-this': ['error', 'self'],
      'dot-notation': [
        'error',
        {
          allowKeywords: true,
          allowPattern: '',
        },
      ],
      'eol-last': ['error', 'always'],
      eqeqeq: ['error'],
      'getter-return': [
        'error',
        {
          allowImplicit: false,
        },
      ],
      'import/no-unresolved': 'warn',
      'lines-around-comment': ['error'],
      'new-cap': [
        'error',
        { capIsNewExceptionPattern: '^Gesture\\.', newIsCap: true },
      ],
      'new-parens': ['off'],
      'no-async-promise-executor': ['error'],
      'no-await-in-loop': ['error'],
      'no-catch-shadow': ['error'],
      'no-compare-neg-zero': ['error'],
      'no-cond-assign': ['error'],
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      'no-constant-condition': [
        'error',
        {
          checkLoops: true,
        },
      ],
      'no-control-regex': ['error'],
      'no-delete-var': ['error'],
      'no-dupe-args': ['error'],
      'no-dupe-else-if': ['error'],
      'no-duplicate-case': ['error'],
      'no-else-return': [
        'error',
        {
          allowElseIf: true,
        },
      ],
      'no-empty': [
        'error',
        {
          allowEmptyCatch: false,
        },
      ],
      'no-empty-character-class': ['error'],
      'no-empty-function': [
        'error',
        {
          allow: ['constructors'],
        },
      ],
      'no-eq-null': ['error'],
      'no-ex-assign': ['error'],
      'no-extend-native': ['error'],
      'no-extra-bind': ['error'],
      'no-extra-boolean-cast': [
        'error',
        {
          enforceForLogicalOperands: false,
        },
      ],
      'no-fallthrough': [
        'error',
        {
          commentPattern: '',
        },
      ],
      'no-func-assign': ['error'],
      'no-implied-eval': ['error'],
      'no-import-assign': ['error'],
      'no-inner-declarations': ['error', 'both'],
      'no-invalid-regexp': ['error'],
      'no-iterator': ['error'],
      'no-label-var': ['error'],
      'no-labels': ['error'],
      'no-lone-blocks': ['error'],
      'no-lonely-if': ['error'],
      'no-loop-func': ['error'],
      'no-new': ['error'],
      'no-new-object': ['error'],
      'no-new-wrappers': ['error'],
      'no-obj-calls': ['error'],
      'no-octal': ['error'],
      'no-octal-escape': ['error'],
      'no-promise-executor-return': ['error'],
      'no-proto': ['error'],
      'no-redeclare': [
        'error',
        {
          builtinGlobals: true,
        },
      ],
      'no-regex-spaces': ['error'],
      'no-relative-import-paths/no-relative-import-paths': [
        'warn',
        { allowedDepth: 1, allowSameFolder: true, prefix: '@', rootDir: 'src' },
      ],
      'no-return-assign': ['error', 'except-parens'],
      'no-script-url': ['error'],
      'no-self-compare': ['error'],
      'no-sequences': ['error'],
      'no-setter-return': ['error'],
      'no-shadow': 'off',
      'no-shadow-restricted-names': ['error'],
      'no-sparse-arrays': ['error'],
      'no-template-curly-in-string': ['error'],
      'no-undef-init': ['error'],
      'no-underscore-dangle': ['error'],
      'no-unexpected-multiline': ['error'],
      'no-unreachable-loop': [
        'error',
        {
          ignore: ['DoWhileStatement'],
        },
      ],
      'no-unsafe-finally': ['error'],
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
      'no-useless-escape': ['error'],
      'no-var': 'error',
      'no-void': [
        'error',
        {
          allowAsStatement: true,
        },
      ],
      'no-with': ['error'],
      'nonblock-statement-body-position': ['error'],
      'perfectionist/sort-classes': [
        'error',
        {
          groups: [
            'index-signature',
            'static-property',
            'private-property',
            'property',
            'constructor',
            ['get-method', 'set-method'],
            'static-method',
            'private-method',
            'static-private-method',
            'method',
            'unknown',
          ],
          order: 'asc',
          type: 'natural',
        },
      ],
      'perfectionist/sort-exports': 'off',
      'perfectionist/sort-imports': 'off',
      'perfectionist/sort-jsx-props': 'off',
      'perfectionist/sort-named-exports': 'off',
      'perfectionist/sort-named-imports': 'off',
      'perfectionist/sort-object-types': 'off',
      'perfectionist/sort-objects': 'warn',
      'prettier/prettier': 'error',
      radix: ['error', 'as-needed'],
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-native/no-unused-styles': 'warn',
      'react-native/sort-styles': 'off', // conflicts with perfectionist/sort-objects
      'react/display-name': 'error',
      'react/jsx-curly-brace-presence': ['error', 'never'],
      'react/jsx-sort-props': [
        'error',
        {
          callbacksLast: true,
          ignoreCase: true,
          multiline: 'last',
          noSortAlphabetically: false,
          shorthandFirst: false,
          shorthandLast: true,
        },
      ],
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'require-atomic-updates': ['error'],
      'require-await': ['error'],
      'simple-import-sort/exports': 'warn',
      'simple-import-sort/imports': 'warn',
      'sort-vars': [
        'error',
        {
          ignoreCase: false,
        },
      ],
      strict: ['error', 'never'],
      'unused-imports/no-unused-imports': 'error',
      'use-isnan': ['error'],
      'valid-typeof': [
        'error',
        {
          requireStringLiterals: false,
        },
      ],
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      react: {
        version: 'detect',
      },
    },
  },
  {
    extends: [configs.recommendedTypeChecked],
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/member-ordering': [
        'error',
        { default: ['signature', 'method', 'constructor', 'field'] },
      ],
      '@typescript-eslint/naming-convention': [
        2,
        {
          format: ['PascalCase'],
          selector: 'enumMember',
        },
      ],
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          ignoreIIFE: true,
          ignoreVoid: true,
        },
      ],
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignoreConditionalTests: true,
          ignoreMixedLogicalExpressions: true,
        },
      ],
      'no-underscore-dangle': 'error',
    },
  }
);
