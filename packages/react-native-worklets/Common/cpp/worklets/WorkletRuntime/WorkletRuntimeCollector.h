#pragma once

#include <worklets/Registries/WorkletRuntimeRegistry.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <jsi/jsi.h>

#include <memory>
#include <utility>

namespace worklets {

class WorkletRuntimeCollector : public jsi::HostObject {
  // When worklet runtime is created, we inject an instance of this class as a
  // `jsi::HostObject` into the global object. When worklet runtime is
  // terminated, the object is garbage-collected, which runs the C++ destructor.
  // In the destructor, we unregister the worklet runtime from the registry.

 public:
  WorkletRuntimeCollector(std::shared_ptr<WorkletRuntimeRegistry> registry, RuntimeData::RuntimeId runtimeId)
      : registry_(std::move(registry)), runtimeId_(runtimeId) {
    registry_->registerRuntime(runtimeId_);
  }

  ~WorkletRuntimeCollector() override {
    registry_->unregisterRuntime(runtimeId_);
  }

  static void
  install(jsi::Runtime &rt, const std::shared_ptr<WorkletRuntimeRegistry> &registry, RuntimeData::RuntimeId runtimeId) {
    setRuntimeIdentityData(rt, RuntimeIdentity{.registry = registry, .runtimeId = runtimeId});
    auto collector = std::make_shared<WorkletRuntimeCollector>(registry, runtimeId);
    auto object = jsi::Object::createFromHostObject(rt, collector);
    rt.global().setProperty(rt, "__workletRuntimeCollector", object);
  }

 private:
  const std::shared_ptr<WorkletRuntimeRegistry> registry_;
  const RuntimeData::RuntimeId runtimeId_;
};

} // namespace worklets
