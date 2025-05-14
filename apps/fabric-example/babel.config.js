/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'react-native-worklets/plugin',
      {
        processNestedWorklets: true,
        experimentalBundling: true,
        // workletModules: ['react-native-worklets'],
      },
    ],
    [
      'module-resolver',
      {
        alias: {
          '@': '../common-app/src',
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],
  ],
};
