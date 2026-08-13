#include <worklets/SharedItems/SynchronizableDynamic.h>

#include <memory>

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

void SynchronizableDynamic::setBlocking(const std::shared_ptr<Serializable> &value) {
  setBlockingBefore();
  value_ = value;
  setBlockingAfter();
}

void SynchronizableDynamic::setBlocking(jsi::Runtime &rt, const jsi::Value &value) {
  setBlocking(extractSerializableOrThrow(rt, value, "[Worklets] Value must be a Serializable."));
}

} // namespace worklets
