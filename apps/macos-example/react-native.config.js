/** This file is required to properly resolve native dependencies */
const { getDependencies } = require('../common-app/scripts/dependencies');

const dependencies = getDependencies(__dirname, [
  'react-native-safe-area-context', // doesn't work on Fabric macos
]);

module.exports = {
  dependencies,
  assets: ['./assets/fonts/'],
};
