// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char CustomSerializableUnpackerCode[] =
    R"DELIMITER__((function () {
  if (!globalThis.__customSerializationRegistry) {
    globalThis.__customSerializationRegistry = [];
  }
  var registry = globalThis.__customSerializationRegistry;
  function customSerializableUnpacker(value, typeId) {
    var data = registry[typeId];
    if (!data) {
      throw new Error("[Worklets] No custom serializable registered for type ID ".concat(typeId, "."));
    }
    return data.unpack(value);
  }
  globalThis.__customSerializableUnpacker = customSerializableUnpacker;
})();)DELIMITER__";
} // namespace worklets
