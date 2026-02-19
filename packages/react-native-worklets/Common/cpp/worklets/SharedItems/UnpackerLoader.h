#pragma once

#include <hermes/hermes.h>
#include <jsi/jsi.h>

#include <string>

namespace worklets {

class UnpackerLoader {
 public:
  void loadUnpackers(
      const std::string &valueUnpackerCode,
      const std::string &synchronizableUnpackerCode,
      const std::string &customSerializableUnpackerCode,
      const std::string &valueUnpackerLocation,
      const std::string &synchronizableUnpackerLocation,
      const std::string &customSerializableUnpackerLocation,
      const std::string &valueUnpackerSourceMap,
      const std::string &synchronizableUnpackerSourceMap,
      const std::string &customSerializableUnpackerSourceMap) {
    valueUnpackerCode_ = ("(" + valueUnpackerCode + ")();");
    synchronizableUnpackerCode_ = ("(" + synchronizableUnpackerCode + ")();");
    customSerializableUnpackerCode_ = ("(" + customSerializableUnpackerCode + ")();");
    valueUnpackerLocation_ = valueUnpackerLocation;
    synchronizableUnpackerLocation_ = synchronizableUnpackerLocation;
    customSerializableUnpackerLocation_ = customSerializableUnpackerLocation;
    valueUnpackerSourceMap_ = (valueUnpackerSourceMap);
    synchronizableUnpackerSourceMap_ = (synchronizableUnpackerSourceMap);
    customSerializableUnpackerSourceMap_ = (customSerializableUnpackerSourceMap);
  }

  void installUnpackers(facebook::jsi::Runtime &rt) const {
    if (valueUnpackerCode_.empty() || synchronizableUnpackerCode_.empty() || customSerializableUnpackerCode_.empty())
        [[unlikely]] {
      throw std::runtime_error(
          "[Worklets] UnpackerLoader tried to install unpackers but the code for unpackers was not loaded.");
    }

#ifdef JS_RUNTIME_HERMES
    //    auto hermesRuntime = dynamic_cast<facebook::hermes::HermesRuntime *>(&rt);
    auto evalWithSourceMap = rt.global().getPropertyAsFunction(rt, "evalWithSourceMap");
    evalWithSourceMap.call(rt, valueUnpackerCode_, valueUnpackerLocation_, valueUnpackerSourceMap_);
    evalWithSourceMap.call(
        rt, synchronizableUnpackerCode_, synchronizableUnpackerLocation_, synchronizableUnpackerSourceMap_);
    evalWithSourceMap.call(
        rt, customSerializableUnpackerCode_, customSerializableUnpackerLocation_, customSerializableUnpackerSourceMap_);
#else

    rt.evaluateJavaScript(valueUnpackerCode_, valueUnpackerLocation_);
    rt.evaluateJavaScript(synchronizableUnpackerCode_, synchronizableUnpackerLocation_);
    rt.evaluateJavaScript(customSerializableUnpackerCode_, customSerializableUnpackerLocation_);
#endif // JS_RUNTIME_HERMES
  }

 private:
  std::string valueUnpackerCode_;
  std::string synchronizableUnpackerCode_;
  std::string customSerializableUnpackerCode_;
  std::string valueUnpackerLocation_;
  std::string synchronizableUnpackerLocation_;
  std::string customSerializableUnpackerLocation_;
  std::string valueUnpackerSourceMap_;
  std::string synchronizableUnpackerSourceMap_;
  std::string customSerializableUnpackerSourceMap_;
};

} // namespace worklets
