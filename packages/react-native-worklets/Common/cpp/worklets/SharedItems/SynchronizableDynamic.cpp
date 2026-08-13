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

// TODO: Shared pointer members (unless they're atomic) can't be assigned
// in a non thread-safe manner, therefore `setDirty` has little sense now.
// void SynchronizableDynamic::setDirty(const std::shared_ptr<Serializable> &value) {
//   setDirtyBefore();
//   value_ = value;
//   setDirtyAfter();
// }

void SynchronizableDynamic::setBlocking(const std::shared_ptr<Serializable> &value) {
  setBlockingBefore();
  value_ = value;
  setBlockingAfter();
}

} // namespace worklets
