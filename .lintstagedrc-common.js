/** @type {import('lint-staged').Configuration} */
module.exports = {
  '*.(js|jsx|mjs|cjs|ts|tsx|mts|cts)': [
    'yarn run --top-level oxlint --type-aware --no-error-on-unmatched-pattern',
    'yarn run --top-level oxfmt',
  ],
};
