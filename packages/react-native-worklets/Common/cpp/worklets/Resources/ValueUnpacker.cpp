// This file was generated with
// `packages/react-native-worklets/scripts/export-unpackers.js`.
// Please do not modify it directly.

#include <worklets/Resources/Unpackers.h>

namespace worklets {

const char ValueUnpackerCode[] =
    R"DELIMITER__((function () {
  var workletsCache = new Map();
  var handleCache = new WeakMap();
  function valueUnpacker(objectToUnpack) {
    var workletHash = objectToUnpack.__workletHash;
    if (workletHash !== undefined) {
      var workletFun = workletsCache.get(workletHash);
      if (workletFun === undefined) {
        var initData = objectToUnpack.__initData;
        if (globalThis.evalWithSourceMap) {
          workletFun = globalThis.evalWithSourceMap('(' + initData.code + '\n)', initData.location, initData.sourceMap);
        } else if (globalThis.evalWithSourceUrl) {
          workletFun = globalThis.evalWithSourceUrl('(' + initData.code + '\n)', "worklet_".concat(workletHash));
        } else {
          workletFun = eval('(' + initData.code + '\n)');
        }
        workletsCache.set(workletHash, workletFun);
      }
      var functionInstance = workletFun.bind(objectToUnpack);
      objectToUnpack._recur = functionInstance;
      return functionInstance;
    } else if (objectToUnpack.__init !== undefined) {
      var value = handleCache.get(objectToUnpack);
      if (value === undefined) {
        value = objectToUnpack.__init();
        handleCache.set(objectToUnpack, value);
      }
      return value;
    }
    throw new Error("[Worklets] Data type in not recognized by value unpacker: \"".concat(globalThis._toString(objectToUnpack), "\"."));
  }
  globalThis.__valueUnpacker = valueUnpacker;
})();)DELIMITER__";
} // namespace worklets
