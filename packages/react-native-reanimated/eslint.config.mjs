import tsEslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import reanimated from 'eslint-plugin-reanimated';

import eslintConfig from '../../eslint.config.mjs';

/**
 * @type {(
 *   | import('typescript-eslint').ConfigWithExtends
 *   | import('eslint').Linter.Config
 * )[]}
 */
const config = tsEslint.config(
  ...eslintConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: [
          './tsconfig.json',
          './tsconfig.web.json',
          '../../tsconfig.json',
          './__tests__/tsconfig.json',
          './__typetests__/tsconfig.json',
        ],
      },
    },
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      'n/no-unpublished-import': [
        'warn',
        {
          ignoreTypeImport: true,
        },
      ],
    },
  },
  {
    plugins: {
      reanimated,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'reanimated/use-reanimated-error': 'error',
      'reanimated/use-logger': 'error',
      'reanimated/no-logger-message-prefix': 'error',
      'reanimated/use-global-this': 'error',
      'no-unused-expressions': 'error',
      camelcase: 'error',
    },
  },
  {
    rules: {
      strict: ['error', 'global'],
    },
    files: ['src/**/*.tsx', 'src/**/*.ts'],
    ignores: ['__tests__', '__mocks__'],
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error',
    },
  }
);

export default config;
