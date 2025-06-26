'use strict';
const NOOP = () => {
  // noop
};

// ts-prune-ignore-next Is this even used?
export default {
  connectNodes: NOOP,
  getValue: () => 0,
  disconnectNodes: NOOP,
  createNode: NOOP,
};
