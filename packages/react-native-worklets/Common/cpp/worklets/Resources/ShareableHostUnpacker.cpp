// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char ShareableHostUnpackerCode[] =
    R"DELIMITER__((function () {
  function shareableHostUnpacker(initial, hostDecorator) {
    var hostShareable = {
      isHost: true,
      __shareableRef: true,
      value: initial
    };
    if (hostDecorator) {
      hostShareable = hostDecorator(hostShareable);
    }
    var shareable = hostShareable;
    return shareable;
  }
  globalThis.__shareableHostUnpacker = shareableHostUnpacker;
})();)DELIMITER__";
} // namespace worklets
