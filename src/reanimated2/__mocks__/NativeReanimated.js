global._setGlobalConsole = (val) => {
  global.console = val;
};

export default {
  installCoreFunctions: () => {},
  makeShareable: (worklet) => worklet,
  makeMutable: () => {},
  makeRemote: () => {},
  startMapper: () => {},
  stopMapper: () => {},
  registerEventHandler: () => {},
  unregisterEventHandler: () => {},
  getViewProp: () => {},
};
