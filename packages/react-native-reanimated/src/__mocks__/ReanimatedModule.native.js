'use strict';
const NOOP = () => {
  // noop
};

export default {
  connectNodes: NOOP,
  getValue: () => 0,
  disconnectNodes: NOOP,
  createNode: NOOP,
};
