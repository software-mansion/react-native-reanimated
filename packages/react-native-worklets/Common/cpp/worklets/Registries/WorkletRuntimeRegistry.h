#pragma once

#include <jsi/jsi.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <shared_mutex>
#include <unordered_set>
#include <utility>

namespace worklets {

class WorkletRuntimeRegistry {
 public:
  template <typename TFn>
  void runWhileLocked(RuntimeData::RuntimeId runtimeId, TFn &&fn) {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    const bool isAlive = runtimeIds_.contains(runtimeId);
    std::forward<TFn>(fn)(isAlive);
  }

 private:
  friend class WorkletRuntimeCollector;

  void registerRuntime(RuntimeData::RuntimeId runtimeId) {
    std::lock_guard<std::shared_mutex> lock(mutex_);
    runtimeIds_.insert(runtimeId);
  }

  void unregisterRuntime(RuntimeData::RuntimeId runtimeId) {
    std::lock_guard<std::shared_mutex> lock(mutex_);
    runtimeIds_.erase(runtimeId);
  }

  std::unordered_set<RuntimeData::RuntimeId> runtimeIds_;
  std::shared_mutex mutex_;
};

struct RuntimeIdentity {
  std::weak_ptr<WorkletRuntimeRegistry> registry;
  RuntimeData::RuntimeId runtimeId{0};

  [[nodiscard]] bool isSameRuntime(const RuntimeIdentity &other) const noexcept {
    return runtimeId == other.runtimeId && !registry.owner_before(other.registry) &&
        !other.registry.owner_before(registry);
  }

  template <typename TFn>
  void runWhileLocked(TFn &&fn) const {
    const auto lockedRegistry = registry.lock();
    if (lockedRegistry == nullptr) {
      std::forward<TFn>(fn)(false);
      return;
    }
    lockedRegistry->runWhileLocked(runtimeId, std::forward<TFn>(fn));
  }
};

class IRuntimeIdentityProvider : public facebook::jsi::ICast {
 public:
  static constexpr facebook::jsi::UUID uuid{0x5b0d3c1e, 0x7a42, 0x4f6e, 0x9c3d, 0x2e81a4b7f019};

  [[nodiscard]] virtual const RuntimeIdentity &getRuntimeIdentity() const noexcept = 0;

 protected:
  ~IRuntimeIdentityProvider() = default;
};

constexpr facebook::jsi::UUID runtimeIdentityDataUUID{0x1f6a2d94, 0x3c8b, 0x4e05, 0xb7a1, 0x6d24c9e83f52};

const RuntimeIdentity *findRuntimeIdentity(facebook::jsi::Runtime &rt);

void setRuntimeIdentityData(facebook::jsi::Runtime &rt, const RuntimeIdentity &identity);

} // namespace worklets
