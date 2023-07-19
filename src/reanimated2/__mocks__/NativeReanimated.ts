// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import MutableValue from './MutableValue';

const NOOP = () => {
  // noop
};

// ts-prune-ignore-next
export default {
  installCoreFunctions: NOOP,
  makeShareable: (worklet) => worklet,
  makeMutable: (init) => new MutableValue(init),
  makeRemote: NOOP,
  startMapper: NOOP,
  stopMapper: NOOP,
  registerEventHandler: NOOP,
  unregisterEventHandler: NOOP,
  getViewProp: NOOP,
};
