module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
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
    '../plugin',
  ],
};
