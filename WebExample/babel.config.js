module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.js', '.ts', '.tsx'],
          alias: {
            react: './node_modules/react',
            'react-native': './node_modules/react-native-web',
            'react-native-reanimated': '../src/index',
          },
        },
      ],
      '@babel/plugin-proposal-export-namespace-from',
      'react-native-reanimated/plugin',
    ],
  };
};
