/** @type {import('lint-staged').Configuration} */
module.exports = {
  '*.(js|jsx|ts|tsx)': ['yarn run -T oxlint', 'yarn run -T oxfmt'],
};
