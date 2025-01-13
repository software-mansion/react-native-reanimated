#pragma once

#include <worklets/Registries/WorkletRuntimeRegistry.h>

#include <jsi/jsi.h>

#include <memory>

namespace worklets {

class WorkletRuntimeCollector : public jsi::NativeState {
  // When worklet runtime is created, we inject an object with native state into
  // the global object. When worklet runtime is terminated, the object is
  // garbage-collected, which runs the C++ destructor. In the destructor, we
  // unregister the worklet runtime from the registry.

 public:
  explicit WorkletRuntimeCollector(jsi::Runtime &runtime) : runtime_(runtime) {
    WorkletRuntimeRegistry::registerRuntime(runtime_);
  }

  ~WorkletRuntimeCollector() {
    WorkletRuntimeRegistry::unregisterRuntime(runtime_);
  }

  static void install(jsi::Runtime &rt) {
    const jsi::Object obj(rt);
    obj.setNativeState(rt, std::make_shared<WorkletRuntimeCollector>(rt));
    rt.global().setProperty(rt, "__workletRuntimeCollector", obj);
  }

 private:
  jsi::Runtime &runtime_;
};

} // namespace worklets
