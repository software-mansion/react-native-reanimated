global._globalSetter = (name, val) => {
  global[name] = val;
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
};
