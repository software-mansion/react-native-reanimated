module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/preset-typescript',
    'module:metro-react-native-babel-preset',
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    ['./plugin', { disableInlineStylesWarning: true }],
    [
      '@babel/plugin-transform-react-jsx',
      {
        runtime: 'classic',
      },
    ],
  ],
};
