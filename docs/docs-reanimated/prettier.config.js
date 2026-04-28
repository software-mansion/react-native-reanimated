// We can't bump to Prettier 3.x because current version of Docusaurus
// crashes on build with it.

module.exports = {
  bracketSameLine: true,
  printWidth: 80,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  arrowParens: 'always',
  embeddedLanguageFormatting: 'off',
};
