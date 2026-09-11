const shim = require('../babel.js');

const MOCK_VERSION = 'x.y.z';

module.exports = function workletsOxcPluginWithMockedVersion(babelApi) {
  const plugin = shim(babelApi);
  const enter = plugin.visitor.Program.enter;
  plugin.visitor.Program.enter = function (programPath, state) {
    state.opts = { pluginVersion: MOCK_VERSION, ...state.opts };
    return enter.call(this, programPath, state);
  };
  return plugin;
};
