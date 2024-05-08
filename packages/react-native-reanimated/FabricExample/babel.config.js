module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [['../plugin', {processNestedWorklets: true}]],
};
