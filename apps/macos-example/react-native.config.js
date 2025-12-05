/** This file is required to properly resolve native dependencies */
const { getDependencies } = require('../common-app/scripts/dependencies');

const dependencies = getDependencies(__dirname, [
  'react-native-nitro-modules', // Nitro Modules have trouble compiling on macOS.
  'react-native-mmkv',
]);

module.exports = {
  dependencies,
  assets: ['./assets/fonts/'],
};
