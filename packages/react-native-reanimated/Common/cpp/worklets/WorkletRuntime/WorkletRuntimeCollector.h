#pragma once

#include <worklets/Registries/WorkletRuntimeRegistry.h>

#include <jsi/jsi.h>

#include <memory>

namespace worklets {

class WorkletRuntimeCollector : public facebook::jsi::HostObject {
  // When worklet runtime is created, we inject an instance of this class as a
  // `facebook::jsi::HostObject` into the global object. When worklet runtime is
  // terminated, the object is garbage-collected, which runs the C++ destructor.
  // In the destructor, we unregister the worklet runtime from the registry.

 public:
  explicit WorkletRuntimeCollector(facebook::jsi::Runtime &runtime)
      : runtime_(runtime) {
    WorkletRuntimeRegistry::registerRuntime(runtime_);
  }

  ~WorkletRuntimeCollector() {
    WorkletRuntimeRegistry::unregisterRuntime(runtime_);
  }

  static void install(facebook::jsi::Runtime &rt) {
    auto collector = std::make_shared<WorkletRuntimeCollector>(rt);
    auto object = facebook::jsi::Object::createFromHostObject(rt, collector);
    rt.global().setProperty(rt, "__workletRuntimeCollector", object);
  }

 private:
  facebook::jsi::Runtime &runtime_;
};

} // namespace worklets
