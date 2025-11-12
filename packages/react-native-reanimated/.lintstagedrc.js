const commonConfig = require('../../.lintstagedrc-common.js');

/** @type {import('lint-staged').Configuration} */
module.exports = {
  ...commonConfig,
  '*.{cpp,h}': ['clang-format -i'],
};
