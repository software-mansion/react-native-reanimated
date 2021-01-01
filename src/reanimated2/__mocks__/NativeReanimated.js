import MutableValue from './MutableValue';

global._setGlobalConsole = (val) => {};

export default {
  installCoreFunctions: () => {},
  makeShareable: (worklet) => worklet,
  makeMutable: (init) => new MutableValue(init),
  makeRemote: () => {},
  startMapper: () => {},
  stopMapper: () => {},
  registerEventHandler: () => {},
  unregisterEventHandler: () => {},
  getViewProp: () => {},
};
