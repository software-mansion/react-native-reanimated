#pragma once

#include <hermes/hermes.h>
#include <jsi/jsi.h>

#include "Shareables.h"

#include <memory>
#include <string>
#include <thread>
#include <utility>
#include <vector>

using namespace facebook;

namespace reanimated {

class WorkletRuntime : public jsi::HostObject {
 private:
  std::shared_ptr<jsi::Runtime> runtime_;
  std::string name_;

 public:
  explicit WorkletRuntime(const std::string &name);

  void installValueUnpacker(const std::string &valueUnpackerCode);

  std::shared_ptr<jsi::Runtime> getRuntime() const {
    // TODO: return `jsi::Runtime &` instead
    return runtime_;
  }

  template <typename... Args>
  inline void runGuarded(
      const std::shared_ptr<ShareableWorklet> &shareableWorklet,
      Args &&...args) {
    runOnRuntimeGuarded(
        *runtime_,
        shareableWorklet->getJSValue(*runtime_),
        std::forward<Args>(args)...);
  }

  std::string toString() const {
    return "<WorkletRuntime \"" + name_ + "\">";
  }

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override;

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;
};

// This function needs to be non-inline to avoid problems with dynamic_cast on
// Android
std::shared_ptr<WorkletRuntime> extractWorkletRuntime(
    jsi::Runtime &rt,
    const jsi::Value &value);

} // namespace reanimated
