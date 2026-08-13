#include <worklets/SharedItems/SynchronizableDynamic.h>

#include <memory>

namespace worklets {

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

void SynchronizableDynamic::setBlocking(jsi::Runtime &rt, const jsi::Value &value) {
  auto newValue = extractSerializableOrThrow(rt, value, "[Worklets] Value must be a Serializable.");
  setBlockingBefore();
  value_ = newValue;
  setBlockingAfter();
}

} // namespace worklets
