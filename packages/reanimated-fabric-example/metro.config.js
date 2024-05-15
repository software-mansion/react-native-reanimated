const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const path = require('path');

const root = path.resolve(__dirname, '../..');

const config = {
  watchFolders: [root],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
