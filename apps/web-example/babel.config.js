module.exports = function (api) {
  const disableBabelPlugin = process.env.DISABLE_BABEL_PLUGIN === "1";
  // https://babeljs.io/docs/en/config-files#apicache
  api.cache.invalidate(() => disableBabelPlugin);
  if (disableBabelPlugin) {
    console.log("Starting Web example without Babel plugin.");
  }
  return {
    presets: ["babel-preset-expo"],
    plugins: disableBabelPlugin ? [] : ["react-native-reanimated/plugin"],
  };
};
