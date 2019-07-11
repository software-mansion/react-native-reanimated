const blacklist = require('metro-config/src/defaults/blacklist');
const path = require('path');

const glob = require('glob-to-regexp');

function getBlacklist() {
  const nodeModuleDirs = [
    glob(
      `${
        process.platform === 'win32'
          ? path.resolve(__dirname, '..').replace(/\\/g, '/')
          : path.resolve(__dirname, '..')
      }/node_modules/*`
    ),
    glob(
      `${
        process.platform === 'win32'
          ? path.resolve(__dirname).replace(/\\/g, '/')
          : path.resolve(__dirname)
      }/node_modules/metro/node_modules/fbjs/*`
    ),
  ];
  return blacklist(nodeModuleDirs);
}

module.exports = {
  resolver: {
    blacklistRE: getBlacklist(),
    providesModuleNodeModules: [
      'react-native',
      'react',
      'fbjs',
      '@babel/runtime',
    ],
  },
  watchFolders: [path.resolve(__dirname, '..')],
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true,
      },
    }),
  },
};
