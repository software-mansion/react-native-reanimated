// @ts-ignore plugin type isn't exposed
const plugin = require('react-native-worklets/plugin');
console.warn(
  '[Reanimated] Seems like you are using a Babel plugin `react-native-reanimated/plugin`. It was moved to `react-native-worklets` package. Please use `react-native-worklets/plugin` instead.'
);
module.exports = plugin;
