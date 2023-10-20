module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.js', '.ts', '.tsx', '.jsx'],
        alias: {
          'react-native': './node_modules/react-native-web',
          // Uncomment this if you want fast-refresh to work with reanimated:
          // 'react-native-reanimated': '../src/index',
        },
      },
    ],
    ['react-native-reanimated/plugin', { isWeb: true }],
  ],
};
