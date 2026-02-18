#pragma once

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
    valueUnpackerBuffer_ = std::make_shared<facebook::jsi::StringBuffer>("(" + valueUnpackerCode + ")();");
    synchronizableUnpackerBuffer_ =
        std::make_shared<facebook::jsi::StringBuffer>("(" + synchronizableUnpackerCode + ")();");
    customSerializableUnpackerBuffer_ =
        std::make_shared<facebook::jsi::StringBuffer>("(" + customSerializableUnpackerCode + ")();");
    valueUnpackerLocation_ = valueUnpackerLocation;
    synchronizableUnpackerLocation_ = synchronizableUnpackerLocation;
    customSerializableUnpackerLocation_ = customSerializableUnpackerLocation;
  }

  void installUnpackers(facebook::jsi::Runtime &rt) const {
    if (!valueUnpackerBuffer_ || !synchronizableUnpackerBuffer_ || !customSerializableUnpackerBuffer_) [[unlikely]] {
      throw std::runtime_error(
          "[Worklets] UnpackerLoader tried to install unpackers but the code for unpackers was not loaded.");
    }

    rt.evaluateJavaScript(valueUnpackerBuffer_, valueUnpackerLocation_);
    rt.evaluateJavaScript(synchronizableUnpackerBuffer_, synchronizableUnpackerLocation_);
    rt.evaluateJavaScript(customSerializableUnpackerBuffer_, customSerializableUnpackerLocation_);
  }

 private:
  std::shared_ptr<facebook::jsi::StringBuffer> valueUnpackerBuffer_;
  std::shared_ptr<facebook::jsi::StringBuffer> synchronizableUnpackerBuffer_;
  std::shared_ptr<facebook::jsi::StringBuffer> customSerializableUnpackerBuffer_;
  std::string valueUnpackerLocation_;
  std::string synchronizableUnpackerLocation_;
  std::string customSerializableUnpackerLocation_;
};

} // namespace worklets
