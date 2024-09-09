const defaultConfig = require("../../prettier.config");

module.exports = {
  ...defaultConfig,
  // Override plugins that don't work with Prettier 2.x
  plugins: [],
};
