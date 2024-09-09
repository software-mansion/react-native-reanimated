/** @type {import('lint-staged').Config} */
module.exports = {
  '*.(js|ts|tsx)': ['yarn eslint', 'yarn prettier --write'],
};
