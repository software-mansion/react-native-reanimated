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
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-private-methods',
    ['./plugin', { disableInlineStylesWarning: true }],
    [
      '@babel/plugin-transform-react-jsx',
      {
        runtime: 'classic',
      },
    ],
  ],
};
