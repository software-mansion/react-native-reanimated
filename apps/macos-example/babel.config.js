/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.js', '.ts', '.tsx'],
        alias: {
          'react-native': './node_modules/react-native-macos',
        },
      },
    ],
    ['react-native-reanimated/plugin', { processNestedWorklets: true }],
  ],
};
