module.exports = {
  presets: [require.resolve('@docusaurus/core/lib/babel/preset')],
  overrides: [
    {
      // Simulator snippets are interpreted generators, not native worklets.
      // In particular, their imported globalThis is a runtime-local proxy;
      // worklet debug helpers must not access it as the browser global.
      exclude:
        /(?:src[\\/]simulation[\\/]snippets|docs[\\/].*[\\/]_[^\\/]+)[\\/][^\\/]+\.jsx?$/,
      plugins: ['react-native-worklets/plugin'],
    },
  ],
};
