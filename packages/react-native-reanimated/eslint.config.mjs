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
    plugins: {
      reanimated,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'reanimated/use-reanimated-error': 'error',
      'reanimated/use-global-this': 'error',
    },
  }
);

export default config;
