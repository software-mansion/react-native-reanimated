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
    },
  },
);

export default config;
