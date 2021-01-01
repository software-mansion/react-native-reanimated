import MutableValue from './MutableValue';

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
