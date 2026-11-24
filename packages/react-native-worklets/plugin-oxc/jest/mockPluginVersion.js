const shim = require('../babel.js');

const MOCK_VERSION = 'x.y.z';

module.exports = function workletsOxcPluginWithMockedVersion(babelApi) {
  const plugin = shim(babelApi);
  const enter = plugin.visitor.Program.enter;
  plugin.visitor.Program.enter = function (programPath, state) {
    if (process.env.WORKLETS_JEST_SHOULD_MOCK_VERSION !== '0') {
      state.opts = { pluginVersion: MOCK_VERSION, ...state.opts };
    }
    return enter.call(this, programPath, state);
  };
  return plugin;
};
