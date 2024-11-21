#pragma once

#include <cxxreact/MessageQueueThread.h>
#include <worklets/NativeModules/NativeWorkletsModuleSpec.h>
#include <string>

namespace worklets {

class NativeWorkletsModule : public NativeWorkletsModuleSpec {
 public:
  explicit NativeWorkletsModule(const std::string &valueUnpackerCode);

  ~NativeWorkletsModule();

  jsi::Value makeShareableClone(
      jsi::Runtime &rt,
      const jsi::Value &value,
      const jsi::Value &shouldRetainRemote,
      const jsi::Value &nativeStateSource) override;

  [[nodiscard]] inline std::string getValueUnpackerCode() const {
    return valueUnpackerCode_;
  }

 private:
  const std::string valueUnpackerCode_;
};

} // namespace worklets
