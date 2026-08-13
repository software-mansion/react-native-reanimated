#include <worklets/SharedItems/SynchronizableDynamic.h>

#include <memory>
#include <stdexcept>

namespace worklets {

std::shared_ptr<Serializable> SynchronizableDynamic::getDirty() {
  return value_;
}

jsi::Value SynchronizableDynamic::getDirty(jsi::Runtime &rt) {
  return getDirty()->toJSValue(rt);
}

std::shared_ptr<Serializable> SynchronizableDynamic::getBlocking() {
  getBlockingBefore();
  auto value = value_;
  getBlockingAfter();
  return value;
}

jsi::Value SynchronizableDynamic::getBlocking(jsi::Runtime &rt) {
  return getBlocking()->toJSValue(rt);
}

void SynchronizableDynamic::setDirty(const std::shared_ptr<Serializable> &) {
  throw std::runtime_error(
      "[Worklets] Cannot invoke setDirty on a dynamic-type Synchronizable. Use setBlocking instead.");
}

void SynchronizableDynamic::setDirty(jsi::Runtime &, const jsi::Value &) {
  throw std::runtime_error(
      "[Worklets] Cannot invoke setDirty on a dynamic-type Synchronizable. Use setBlocking instead.");
}

void SynchronizableDynamic::setBlocking(const std::shared_ptr<Serializable> &value) {
  setBlockingBefore();
  value_ = value;
  setBlockingAfter();
}

void SynchronizableDynamic::setBlocking(jsi::Runtime &rt, const jsi::Value &value) {
  setBlocking(extractSerializableOrThrow(rt, value, "[Worklets] Value must be a Serializable."));
}

} // namespace worklets
