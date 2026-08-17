'use strict';

if (
  globalThis.__RUNTIME_KIND === undefined ||
  globalThis.__RUNTIME_KIND === 1
) {
  globalThis.__RUNTIME_KIND = 1;
} else if (__DEV__) {
  globalThis.__fbBatchedBridgeConfig = new Proxy(
    {},
    {
      get() {
        throw new Error(
          '[Worklets] Accessing __fbBatchedBridgeConfig is not allowed on Worklet Runtimes. Perhaps you tried to access a Turbo Module?'
        );
      },
    }
  );
}

module.exports = require('react-native');
