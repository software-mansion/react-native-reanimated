'use strict';
const NOOP = () => {
  // noop
};

// ts-prune-ignore-next Is this even used?
export default {
  addListener: NOOP,
  removeAllListeners: NOOP,
};
