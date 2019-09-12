const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Remove the ModuleScopePlugin so we can reach outside the root folder
  config.resolve.plugins = config.resolve.plugins.filter(({ constructor }) => {
    return !(constructor && constructor.name === 'ModuleScopePlugin');
  });

  // Maybe just use the babel alias instead
  config.resolve.alias['react-native-reanimated'] = '../src/Animated';
  return config;
};
