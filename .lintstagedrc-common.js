/** @type {import('lint-staged').Config} */
module.exports = {
  '*.(js|jsx|ts|tsx)': ['yarn eslint', 'yarn prettier --write'],
};
