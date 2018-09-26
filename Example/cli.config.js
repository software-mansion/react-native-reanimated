const path = require('path');
const blacklist = require('metro/src/blacklist');
const glob = require('glob-to-regexp');

module.exports = {
  getProjectRoots() {
    return [__dirname, path.resolve(__dirname, '..')];
  },
  getProvidesModuleNodeModules() {
    return ['react-native', 'react', 'fbjs'];
  },
  getBlacklistRE() {
    return blacklist([glob(`${path.resolve(__dirname, '..')}/node_modules/*`)]);
  },
};
