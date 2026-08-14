#include <worklets/SharedItems/SynchronizableDynamic.h>

#include <atomic>
#include <memory>

namespace worklets {

std::shared_ptr<Serializable> SynchronizableDynamic::getDirty() {
  return std::atomic_load(&value_);
}

std::shared_ptr<Serializable> SynchronizableDynamic::getBlocking() {
  getBlockingBefore();
  auto value = std::atomic_load(&value_);
  getBlockingAfter();
  return value;
}

void SynchronizableDynamic::setBlocking(const std::shared_ptr<Serializable> &value) {
  setBlockingBefore();
  std::atomic_store(&value_, value);
  setBlockingAfter();
}

} // namespace worklets
