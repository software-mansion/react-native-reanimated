const blacklist = require('metro-config/src/defaults/blacklist');
const path = require('path');
const cwd = path.resolve(__dirname);

const pak = require('../package.json');
const glob = require('glob-to-regexp');

const dependencies = Object.keys(pak.dependencies);
const peerDependencies = Object.keys(pak.peerDependencies);

function getBlacklist() {
  const nodeModuleDirs = [
    glob(`${path.resolve(__dirname, '..')}/node_modules/*`),
  ];
  return blacklist(nodeModuleDirs);
}

module.exports = {
  resolver: {
    blacklistRE: getBlacklist(),
    extraNodeModules() {
      return [...dependencies, ...peerDependencies];
    },
  },
  watchFolders: [path.resolve(__dirname, '..')],
};
