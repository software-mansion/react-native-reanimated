#include <worklets/SharedItems/SynchronizableDynamic.h>

#include <atomic>
#include <memory>
#include <stdexcept>

namespace worklets {

SynchronizableValue SynchronizableDynamic::getDirty() {
  return std::atomic_load(&value_);
}

SynchronizableValue SynchronizableDynamic::getBlocking() {
  getBlockingBefore();
  auto value = std::atomic_load(&value_);
  getBlockingAfter();
  return value;
}

void SynchronizableDynamic::setDirty(const SynchronizableFixedValue &) {
  throw std::runtime_error(
      "[Worklets] Cannot invoke setDirty on a dynamic-type Synchronizable. Use setBlocking instead.");
}

void SynchronizableDynamic::setBlocking(const std::shared_ptr<Serializable> &value) {
  setBlockingBefore();
  std::atomic_store(&value_, value);
  setBlockingAfter();
}

void SynchronizableDynamic::setBlocking(const SynchronizableFixedValue &) {
  throw std::runtime_error("[Worklets] Dynamic-type Synchronizable operates on Serializables, not plain values.");
}

} // namespace worklets
