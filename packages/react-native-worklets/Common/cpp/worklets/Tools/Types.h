#pragma once

#include <jsi/jsi.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

namespace worklets {
typedef std::function<void(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &data,
    const facebook::jsi::Value &callback)>
    forwardedFetch;

class WeakRuntimeNativeState : public facebook::jsi::NativeState {
 public:
  WeakRuntimeNativeState(std::weak_ptr<WorkletRuntime> w) : weakRuntime(w){
    
  }
  std::weak_ptr<WorkletRuntime> weakRuntime;
};
} // namespace worklets
