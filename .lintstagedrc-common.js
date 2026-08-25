/** @type {import('lint-staged').Configuration} */
module.exports = {
  '*.(js|jsx|mjs|cjs|ts|tsx|mts|cts)': [
    'yarn eslint --flag v10_config_lookup_from_file',
    'yarn run --top-level oxfmt',
  ],
};
