const blacklist = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const glob = require('glob-to-regexp');

function getBlacklist() {
  const nodeModuleDirs = [
    glob(`${path.resolve(__dirname, '..')}/node_modules/*`),
    glob(`${path.resolve(__dirname, '..')}/docs/*`),
    glob(`${path.resolve(__dirname, '..')}/e2e/*`),
    glob(
      `${path.resolve(__dirname)}/node_modules/*/node_modules/lodash.isequal/*`
    ),
    glob(
      `${path.resolve(
        __dirname
      )}/node_modules/*/node_modules/hoist-non-react-statics/*`
    ),
    glob(
      `${path.resolve(
        __dirname
      )}/node_modules/react-native/node_modules/@babel/*`
    ),
  ];
  return blacklist(nodeModuleDirs);
}

module.exports = {
  resolver: {
    blacklistRE: getBlacklist(),
  },
  watchFolders: [path.resolve(__dirname, '..')],
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
