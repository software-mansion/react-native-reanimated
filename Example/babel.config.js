module.exports = api => {
  const isWeb = api.caller(isTargetWeb);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      !isWeb && [
        'module-resolver',
        {
          alias: {
            'react-native-reanimated': '../src/Animated',
          },
        },
      ],
    ].filter(Boolean),
  };
};

function isTargetWeb(caller) {
  return caller && caller.name === 'babel-loader';
}
