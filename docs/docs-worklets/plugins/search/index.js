const path = require('node:path');
const { NormalModuleReplacementPlugin } = require('webpack');

module.exports = function versionedSearch() {
  return {
    name: 'worklets-versioned-search',
    configureWebpack() {
      return {
        plugins: [
          // t-rex-ui imports its search entry directly, bypassing @theme/SearchBar.
          // Route both desktop and mobile search through the site's theme override.
          new NormalModuleReplacementPlugin(
            /(?:^|[\\/])SearchBar\.js$/,
            (resource) => {
              if (/[\\/]@swmansion[\\/]t-rex-ui[\\/]/.test(resource.context)) {
                resource.request = path.resolve(
                  __dirname,
                  '../../src/theme/SearchBar/index.js'
                );
              }
            }
          ),
        ],
      };
    },
  };
};
