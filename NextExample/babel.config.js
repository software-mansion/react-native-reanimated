module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.js', '.ts', '.tsx', '.jsx'],
        alias: {
          'react-native': './node_modules/react-native-web',
          'react-native-reanimated': '../src/index',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
