const path = require('path');

module.exports = {
  source: 'src',
  output: 'lib',
  targets: [
    [
      'module',
      {
        esm: false,
        jsxRuntime: 'automatic',
        configFile: path.resolve(__dirname, 'bob.babel.config.js'),
      },
    ],
    'typescript',
  ],
};
