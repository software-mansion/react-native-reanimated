const { getDefaultConfig } = require('expo/metro-config');
const { getMonorepoMetroOptions } = require('../../scripts/metro');

const config = getDefaultConfig(__dirname);
const { blockList, extraNodeModules } = getMonorepoMetroOptions(
  ['react', 'react-native'],
  __dirname,
  config
);

config.resolver.blockList = blockList;
config.resolver.extraNodeModules = extraNodeModules;

module.exports = config;
