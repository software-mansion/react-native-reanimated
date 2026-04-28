/** @type {import('lint-staged').Configuration} */
module.exports = {
  '*.(js|jsx|ts|tsx)': ['yarn oxlint', 'yarn prettier --write'],
};
