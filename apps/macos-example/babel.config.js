/** @type {import('react-native-worklets/plugin').PluginOptions} */
const workletOptions = {};

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          'react-native': './node_modules/react-native-macos',
          '@': '../common-app/src',
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],
    ['react-native-worklets/plugin', workletOptions],
  ],
};
