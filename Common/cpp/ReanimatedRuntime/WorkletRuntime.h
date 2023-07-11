#pragma once

#include <hermes/hermes.h>
#include <jsi/jsi.h>
#include <thread>

#include "Shareables.h"

#include <memory>
#include <string>
#include <vector>

using namespace facebook;

namespace reanimated {

class WorkletRuntime : public jsi::HostObject {
 private:
  std::shared_ptr<jsi::Runtime> runtime_;
  std::string name_;

 public:
  explicit WorkletRuntime(
      const std::string &name,
      const std::string &valueUnpackerCode);

  std::shared_ptr<jsi::Runtime> getRuntime() const {
    return runtime_;
  }

  std::string toString() const {
    return "<WorkletRuntime \"" + name_ + "\">";
  }

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &propName) override;

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override;
};

std::shared_ptr<jsi::Runtime> runtimeFromValue(
    jsi::Runtime &rt,
    const jsi::Value &value);
// this function extracts the underlying runtime from
// jsi::HostObject<WorkletRuntime> this function is meant to be called on the
// main RN runtime this function needs to be non-inline to avoid problems with
// dynamic_cast on Android

} // namespace reanimated
