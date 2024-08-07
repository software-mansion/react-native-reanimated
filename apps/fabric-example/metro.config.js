const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  withReanimated,
} = require('../../packages/react-native-reanimated/metro-config');

const path = require('path');

const root = path.resolve(__dirname, '../..');

const config = {
  watchFolders: [root],
};

module.exports = withReanimated(
  mergeConfig(getDefaultConfig(__dirname), config)
);
