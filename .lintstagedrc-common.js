/** @type {import('lint-staged').Config} */
module.exports = {
  '*.(js|jsx|ts|tsx)': [
    'yarn eslint --flag unstable_config_lookup_from_file',
    'yarn prettier --write',
  ],
};
