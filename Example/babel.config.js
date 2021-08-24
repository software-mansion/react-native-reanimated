module.exports = (api) => {
  const isWeb = api.caller(isTargetWeb);

  return {
    presets: [
      '@babel/preset-typescript',
      'module:metro-react-native-babel-preset',
    ],
    plugins: [
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-transform-modules-commonjs',
      '../plugin',
      isWeb
        ? [
            'module-resolver',
            {
              alias: {
                'react-native-reanimated': './Animated/',
              },
            },
          ]
        : [
            'module-resolver',
            {
              alias: {
                'react-native-reanimated': '../src/Animated',
                react: './node_modules/react',
                'react-native': './node_modules/react-native',
                '@babel': './node_modules/@babel',
                'lodash.isequal': './node_modules/lodash.isequal',
                'hoist-non-react-statics':
                  './node_modules/hoist-non-react-statics',
                invariant: './node_modules/invariant',
                'prop-types': './node_modules/prop-types',
              },
            },
          ],
    ].filter(Boolean),
  };
};

function isTargetWeb(caller) {
  return caller && caller.name === 'babel-loader';
}
