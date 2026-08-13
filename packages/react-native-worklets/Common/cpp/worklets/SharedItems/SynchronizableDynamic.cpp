#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/SynchronizableDynamic.h>

#include <memory>

namespace worklets {

SynchronizableDynamic::SynchronizableDynamic(const std::shared_ptr<Serializable> &value) : value_(value) {}

bool SynchronizableDynamic::isFixed() const {
  return false;
}

jsi::Value SynchronizableDynamic::getDirty(jsi::Runtime &rt) {
  auto value = value_;
  return value->toJSValue(rt);
}

jsi::Value SynchronizableDynamic::getBlocking(jsi::Runtime &rt) {
  getBlockingBefore();
  auto value = value_;
  getBlockingAfter();
  return value->toJSValue(rt);
}

void SynchronizableDynamic::setDirty(jsi::Runtime &, const jsi::Value &) {
  react_native_assert(false && "[Worklets] Expected a fixed-type Synchronizable.");
}

void SynchronizableDynamic::setBlocking(jsi::Runtime &rt, const jsi::Value &value) {
  auto newValue = extractSerializableOrThrow(rt, value, "[Worklets] Value must be a Serializable.");
  setBlockingBefore();
  value_ = newValue;
  setBlockingAfter();
}

} // namespace worklets
