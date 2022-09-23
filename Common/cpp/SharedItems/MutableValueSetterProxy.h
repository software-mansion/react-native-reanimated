#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <utility>
#include "SharedParent.h"
#include "Logger.h"

using namespace facebook;

namespace reanimated {

class MutableValueSetterProxy : public jsi::HostObject {
 private:
  friend MutableValue;
  std::shared_ptr<MutableValue> mutableValue;

 public:
  explicit MutableValueSetterProxy(std::shared_ptr<MutableValue> mutableValue)
      : mutableValue(std::move(mutableValue)) {
        Logger::log("Create MVSP");
      }
  ~MutableValueSetterProxy() {
    Logger::log("Destroy MVSP");
  }
  void
  set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
};

} // namespace reanimated
