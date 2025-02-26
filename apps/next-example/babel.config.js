/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        alias: {
          'react-native': '../../node_modules/react-native-web',
          // Uncomment this if you want fast-refresh to work with reanimated:
          // 'react-native-reanimated': '../../packages/react-native-reanimated/src',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
