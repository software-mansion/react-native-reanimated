#pragma once

#include <jsi/jsi.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/Registries/WorkletRuntimeRegistry.h>
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/WorkletsSystraceSection.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <array>
#include <atomic>
#include <cstddef>
#include <memory>
#include <type_traits>
#include <utility>

namespace worklets {

template <typename TSerializable>
  requires std::is_base_of_v<Serializable, TSerializable>
class RetainingSerializableStore {
 private:
  static constexpr std::size_t kSlotsPerChunk = 4;

  struct Slot {
    std::atomic<facebook::jsi::Runtime *> runtime{nullptr};
    facebook::jsi::Value value{facebook::jsi::Value::undefined()};
  };

  std::array<Slot, kSlotsPerChunk> slots_{};

  std::atomic<RetainingSerializableStore *> nextChunk_{nullptr};
  std::unique_ptr<RetainingSerializableStore> nextChunkOwner_{};

  const facebook::jsi::Value *find(facebook::jsi::Runtime *rt) {
    for (auto &slot : slots_) {
      if (slot.runtime.load(std::memory_order_acquire) == rt) {
        return &slot.value;
      }
    }
    if (auto *next = nextChunk_.load(std::memory_order_acquire)) {
      return next->find(rt);
    }
    return nullptr;
  }

  void store(facebook::jsi::Runtime *rt, facebook::jsi::Value value) {
    for (auto &slot : slots_) {
      if (slot.runtime.load(std::memory_order_relaxed) != nullptr) {
        continue;
      }
      facebook::jsi::Runtime *expected = nullptr;
      if (slot.runtime.compare_exchange_strong(expected, rt, std::memory_order_acq_rel)) {
        slot.value = std::move(value);
        return;
      }
    }

    auto *next = nextChunk_.load(std::memory_order_acquire);
    if (next == nullptr) {
      auto fresh = std::make_unique<RetainingSerializableStore>();
      auto *freshChunk = fresh.get();
      if (nextChunk_.compare_exchange_strong(next, freshChunk, std::memory_order_acq_rel)) {
        nextChunkOwner_ = std::move(fresh);
        next = freshChunk;
      }
    }
    next->store(rt, std::move(value));
  }

 public:
  RetainingSerializableStore() = default;

  ~RetainingSerializableStore() {
    for (auto &slot : slots_) {
      cleanupRuntimeAware(slot.runtime.load(std::memory_order_relaxed), slot.value);
    }
  }

  facebook::jsi::Value getOrStore(facebook::jsi::Runtime &rt, TSerializable &serializable) {
    if (const auto *cachedValue = find(&rt)) {
      return facebook::jsi::Value(rt, *cachedValue);
    }

    auto jsValue = serializable.TSerializable::toJSValue(rt);
    store(&rt, facebook::jsi::Value(rt, jsValue));

    return jsValue;
  }
};

template <typename TSerializable>
  requires std::is_base_of_v<Serializable, TSerializable>
class RetainingSerializable : virtual public TSerializable {
 private:
  std::unique_ptr<RetainingSerializableStore<TSerializable>> store_{
      std::make_unique<RetainingSerializableStore<TSerializable>>()};

 public:
  template <typename... Args>
  explicit RetainingSerializable(facebook::jsi::Runtime &rt, Args &&...args)
      : TSerializable(rt, std::forward<Args>(args)...) {}

  ~RetainingSerializable() override = default;

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override {
    return store_->getOrStore(rt, *this);
  }
};

} // namespace worklets
