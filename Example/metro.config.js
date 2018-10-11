const blacklist = require('metro-config/src/defaults/blacklist');
const path = require('path');
const cwd = path.resolve(__dirname);

const glob = require('glob-to-regexp');

function getBlacklist() {
  const nodeModuleDirs = [
    glob(`${path.resolve(__dirname, '..')}/node_modules/*`),
    glob(`${path.resolve(__dirname)}/node_modules/metro/node_modules/fbjs/*`),
  ];
  return blacklist(nodeModuleDirs);
}

module.exports = {
  resolver: {
    blacklistRE: getBlacklist(),
    providesModuleNodeModules: ['react-native', 'react', 'fbjs'],
  },
  watchFolders: [path.resolve(__dirname, '..')],
};
