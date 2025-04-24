'use strict';

if (globalThis._WORKLET) {
  globalThis._log('not using turbo module');
  module.exports = {
    WorkletsTurboModule: {},
  };
} else {
  module.exports = {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    WorkletsTurboModule: require('./NativeWorkletsModule').default,
  };
}
