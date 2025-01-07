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
          '~': '../common-app/src/features',
        },
        extensions: ['.js', '.ts', '.tsx', '.svg', '.json'],
      },
    ],
    ['react-native-reanimated/plugin', { processNestedWorklets: true }],
  ],
};
