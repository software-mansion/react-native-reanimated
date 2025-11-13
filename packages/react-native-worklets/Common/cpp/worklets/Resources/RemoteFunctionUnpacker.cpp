// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char RemoteFunctionUnpackerCode[] =
    R"DELIMITER__((function () {
  function remoteFunctionUnpacker(remoteFunctionRef, remoteFunctionName) {
    'use strict';

    var remoteFunctionGuard = function remoteFunctionGuard() {
      throw new Error("[Worklets] Tried to synchronously call a non-worklet function ".concat(remoteFunctionName, " on the UI thread.\nSee https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-non-worklet-function-on-the-ui-thread for more details."));
    };
    remoteFunctionGuard.__remoteFunctionRef = remoteFunctionRef;
    Object.defineProperty(remoteFunctionGuard, 'name', {
      value: "".concat(remoteFunctionName, "_remoteFunctionGuard"),
      writable: false,
      configurable: true
    });
    return remoteFunctionGuard;
  }
  globalThis.__remoteFunctionUnpacker = remoteFunctionUnpacker;
})();)DELIMITER__";
} // namespace worklets
