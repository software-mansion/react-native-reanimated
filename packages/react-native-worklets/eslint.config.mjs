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
        ],
      },
    },
    plugins: {
      reanimated,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'reanimated/use-worklets-error': 'error',
      'reanimated/use-global-this': 'error',
      'no-bitwise': 'error',
      // TODO: Use this rule in Reanimated (globally in the repo) too
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*.native', '*.ios', '*.android', '*.web'],
              message:
                "Don't import with platform specifier, use extensionless imports.",
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      strict: ['error', 'global'],
      '@typescript-eslint/no-explicit-any': 'error',
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
