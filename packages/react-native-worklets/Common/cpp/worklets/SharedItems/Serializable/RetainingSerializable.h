#pragma once

#include <jsi/jsi.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/Tools/WorkletsSystraceSection.h>
#include <worklets/WorkletRuntime/RuntimeData.h>
#include <worklets/WorkletRuntime/RuntimeIdentity.h>

#include <array>
#include <atomic>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <type_traits>
#include <utility>

namespace worklets {

template <typename TSerializable>
  requires std::is_base_of_v<Serializable, TSerializable>
class RetainingSerializableStore {
 private:
  static constexpr std::size_t kSlotsPerChunk = 4;

  enum class SlotState : std::uint8_t {
    Empty,
    Claimed,
    Ready,
  };

  struct Slot {
    std::atomic<SlotState> state{SlotState::Empty};
    RuntimeIdentity owner{};
    facebook::jsi::Value value{facebook::jsi::Value::undefined()};
  };

  std::array<Slot, kSlotsPerChunk> slots_{};

  std::atomic<RetainingSerializableStore *> nextChunk_{nullptr};
  std::unique_ptr<RetainingSerializableStore> nextChunkOwner_{};

  const facebook::jsi::Value *find(const RuntimeIdentity &identity) {
    for (auto &slot : slots_) {
      if (slot.state.load(std::memory_order_acquire) == SlotState::Ready && slot.owner.isSameRuntime(identity)) {
        return &slot.value;
      }
    }
    if (auto *next = nextChunk_.load(std::memory_order_acquire)) {
      return next->find(identity);
    }
    return nullptr;
  }

  void store(const RuntimeIdentity &identity, facebook::jsi::Value value) {
    for (auto &slot : slots_) {
      if (slot.state.load(std::memory_order_relaxed) != SlotState::Empty) {
        continue;
      }
      auto expected = SlotState::Empty;
      if (slot.state.compare_exchange_strong(expected, SlotState::Claimed, std::memory_order_acq_rel)) {
        slot.owner = identity;
        slot.value = std::move(value);
        slot.state.store(SlotState::Ready, std::memory_order_release);
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
    next->store(identity, std::move(value));
  }

 public:
  RetainingSerializableStore() = default;

  ~RetainingSerializableStore() {
    for (auto &slot : slots_) {
      if (slot.state.load(std::memory_order_acquire) == SlotState::Ready) {
        cleanupRuntimeAware(slot.owner, slot.value);
      }
    }
  }

  facebook::jsi::Value getOrStore(facebook::jsi::Runtime &rt, TSerializable &serializable) {
    const auto *identity = findRuntimeIdentity(rt);
    if (identity == nullptr) [[unlikely]] {
      return serializable.TSerializable::toJSValue(rt);
    }

    if (const auto *cachedValue = find(*identity)) {
      return facebook::jsi::Value(rt, *cachedValue);
    }

    auto jsValue = serializable.TSerializable::toJSValue(rt);
    store(*identity, facebook::jsi::Value(rt, jsValue));

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
