/** @type {import('lint-staged').Configuration} */
module.exports = {
  '*.(js|jsx|ts|tsx)': [
    'yarn eslint --flag v10_config_lookup_from_file',
    'yarn prettier --write',
  ],
};
