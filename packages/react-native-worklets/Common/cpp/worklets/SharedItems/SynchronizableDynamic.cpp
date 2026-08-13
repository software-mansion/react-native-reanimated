#include <worklets/SharedItems/SynchronizableDynamic.h>

#include <memory>

namespace worklets {

std::shared_ptr<Serializable> SynchronizableDynamic::getDirty() {
  return value_;
}

std::shared_ptr<Serializable> SynchronizableDynamic::getBlocking() {
  getBlockingBefore();
  auto value = value_;
  getBlockingAfter();
  return value;
}

void SynchronizableDynamic::setBlocking(const std::shared_ptr<Serializable> &value) {
  setBlockingBefore();
  value_ = value;
  setBlockingAfter();
}

} // namespace worklets
