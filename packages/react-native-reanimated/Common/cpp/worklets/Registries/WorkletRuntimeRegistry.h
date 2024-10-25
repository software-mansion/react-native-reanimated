#pragma once

#include <jsi/jsi.h>

#include <mutex>
#include <set>

namespace worklets {

class WorkletRuntimeRegistry {
 private:
  static std::set<facebook::jsi::Runtime *> registry_;
  static std::mutex mutex_; // Protects `registry_`.

  WorkletRuntimeRegistry() {} // private ctor

  static void registerRuntime(facebook::jsi::Runtime &runtime) {
    std::lock_guard<std::mutex> lock(mutex_);
    registry_.insert(&runtime);
  }

  static void unregisterRuntime(facebook::jsi::Runtime &runtime) {
    std::lock_guard<std::mutex> lock(mutex_);
    registry_.erase(&runtime);
  }

  friend class WorkletRuntimeCollector;

 public:
  static bool isRuntimeAlive(facebook::jsi::Runtime *runtime) {
    assert(runtime != nullptr);
    std::lock_guard<std::mutex> lock(mutex_);
    return registry_.find(runtime) != registry_.end();
  }
};

} // namespace worklets
