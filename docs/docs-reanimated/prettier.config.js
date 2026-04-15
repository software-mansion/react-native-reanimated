const defaultConfig = require('../../prettier.config');

// We can't bump to Prettier 3.x because current version of Docusaurus
// crashes on build with it.

module.exports = {
  ...defaultConfig,
  // Override plugins that don't work with Prettier 2.x
  plugins: [],
  embeddedLanguageFormatting: 'off',
};
