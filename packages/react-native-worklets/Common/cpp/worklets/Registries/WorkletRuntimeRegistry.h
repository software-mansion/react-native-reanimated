#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>

#include <set>
#include <shared_mutex>
#include <utility>

using namespace facebook;

namespace worklets {

class WorkletRuntimeRegistry {
 private:
  static std::set<jsi::Runtime *> registry_;
  static std::shared_mutex mutex_;

  WorkletRuntimeRegistry() {}

  static void registerRuntime(jsi::Runtime &runtime) {
    std::lock_guard<std::shared_mutex> lock(mutex_);
    registry_.insert(&runtime);
  }

  static void unregisterRuntime(jsi::Runtime &runtime) {
    markRuntimeDead(&runtime);
  }

  friend class WorkletRuntimeCollector;

 public:
  // Marks a runtime as dead before it is torn down. The collector host object
  // unregisters a runtime only when it is finalized, and during teardown the
  // runtime can finalize other host objects first. Those objects may hold
  // cached `jsi::Value`s of the same runtime, and running their destructors
  // then crashes. Call this before the runtime is destroyed (from its owner,
  // or from module invalidation for the React Native runtime), so that
  // `cleanupRuntimeAware` frees those values without calling into the runtime.
  static void markRuntimeDead(jsi::Runtime *runtime) {
    if (runtime == nullptr) {
      return;
    }
    std::lock_guard<std::shared_mutex> lock(mutex_);
    registry_.erase(runtime);
  }

  template <typename TFn>
  static void runWhileLocked(jsi::Runtime *runtime, TFn &&fn) {
    react_native_assert(runtime != nullptr && "runtime is nullptr");
    std::shared_lock<std::shared_mutex> lock(mutex_);
    const bool isAlive = registry_.find(runtime) != registry_.end();
    std::forward<TFn>(fn)(isAlive);
  }
};

} // namespace worklets
