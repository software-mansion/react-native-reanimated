import tsEslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import reanimated from 'eslint-plugin-reanimated';
import { globalIgnores } from 'eslint/config';

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
      'reanimated/use-worklets-error': 'error',
      'reanimated/use-global-this': 'error',
    },
  },
  globalIgnores([
    '**/plugin/**',
  ])
);

export default config;
