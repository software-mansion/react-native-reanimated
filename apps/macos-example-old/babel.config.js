/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          'react-native': './node_modules/react-native-macos',
          'react-native-safe-area-context': './lib/react-native-safe-area-context',
          '@': '../common-app/src',
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    ],
    ['react-native-reanimated/plugin', { processNestedWorklets: true }],
  ],
};
