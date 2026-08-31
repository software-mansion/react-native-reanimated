#include <worklets/SharedItems/SynchronizableFixed.h>

#include <memory>
#include <stdexcept>
#include <type_traits>
#include <variant>

namespace worklets {

std::shared_ptr<SynchronizableFixed> SynchronizableFixed::make(const SynchronizableFixedValue &initialValue) {
  return std::visit(
      [](const auto &alternative) { return std::make_shared<SynchronizableFixed>(alternative); }, initialValue);
}

SynchronizableValue SynchronizableFixed::getDirty() {
  return load();
}

SynchronizableValue SynchronizableFixed::getBlocking() {
  getBlockingBefore();
  auto value = load();
  getBlockingAfter();
  return value;
}

void SynchronizableFixed::setDirty(const SynchronizableFixedValue &value) {
  setDirtyBefore();
  const auto stored = store(value);
  setDirtyAfter();
  if (!stored) {
    throwTypeMismatch();
  }
}

void SynchronizableFixed::setBlocking(const std::shared_ptr<Serializable> &) {
  throw std::runtime_error("[Worklets] Fixed-type Synchronizable operates on plain values, not Serializables.");
}

void SynchronizableFixed::setBlocking(const SynchronizableFixedValue &value) {
  setBlockingBefore();
  const auto stored = store(value);
  setBlockingAfter();
  if (!stored) {
    throwTypeMismatch();
  }
}

bool SynchronizableFixed::store(const SynchronizableFixedValue &value) {
  return std::visit(
      [](auto &atomic, const auto &alternative) {
        using TAtomic = std::decay_t<decltype(atomic)>;
        using TAlternative = std::decay_t<decltype(alternative)>;
        if constexpr (std::is_same_v<TAtomic, std::atomic<TAlternative>>) {
          atomic.store(alternative, std::memory_order_relaxed);
          return true;
        } else {
          return false;
        }
      },
      value_,
      value);
}

SynchronizableValue SynchronizableFixed::load() const {
  return std::visit(
      [](const auto &atomic) { return SynchronizableValue(atomic.load(std::memory_order_relaxed)); }, value_);
}

void SynchronizableFixed::throwTypeMismatch() const {
  throw std::runtime_error(
      std::holds_alternative<std::atomic<double>>(value_)
          ? "[Worklets] Expected a number for a fixed-type Synchronizable."
          : "[Worklets] Expected a boolean for a fixed-type Synchronizable.");
}

} // namespace worklets
