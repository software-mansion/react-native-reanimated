#pragma once

#include "WorkletRuntimeRegistry.h"

#include <jsi/jsi.h>

#include <memory>

namespace reanimated {

class WorkletRuntimeCollector : public jsi::HostObject {
 private:
  jsi::Runtime &runtime_;

 public:
  explicit WorkletRuntimeCollector(jsi::Runtime &runtime) : runtime_(runtime) {
    WorkletRuntimeRegistry::registerRuntime(&runtime_);
  }

  ~WorkletRuntimeCollector() {
    WorkletRuntimeRegistry::unregisterRuntime(&runtime_);
  }

  static void install(jsi::Runtime &rt) {
    auto collector = std::make_shared<WorkletRuntimeCollector>(rt);
    auto object = jsi::Object::createFromHostObject(rt, collector);
    rt.global().setProperty(rt, "__reanimatedRuntimeCollector", object);
  }
};

} // namespace reanimated
