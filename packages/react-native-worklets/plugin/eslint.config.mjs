import tsEslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

import eslintConfig from '../../../eslint.config.mjs';

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
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'no-bitwise': 'error',
    },
    ignores: [],
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'no-bitwise': 'off',
      'no-redeclare': 'warn'
    },
  },
);

export default config;
