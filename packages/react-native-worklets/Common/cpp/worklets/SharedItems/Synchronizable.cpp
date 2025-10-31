#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Synchronizable.h>

#include <memory>
#include <utility>

namespace worklets {

std::shared_ptr<Serializable> Synchronizable::getDirty() {
  return value_;
}

std::shared_ptr<Serializable> Synchronizable::getBlocking() {
  getBlockingBefore();
  auto value = value_;
  getBlockingAfter();
  return value;
}

// TODO: Shared pointer members (unless they're atomic) can't be assigned
// in a non thread-safe manner, therefore `setDirty` has little sense now.
// void Synchronizable::setDirty(const std::shared_ptr<Serializable> &value) {
//   setDirtyBefore();
//   value_ = value;
//   setDirtyAfter();
// }

void Synchronizable::setBlocking(const std::shared_ptr<Serializable> &value) {
  setBlockingBefore();
  value_ = value;
  setBlockingAfter();
}

jsi::Value Synchronizable::toJSValue(jsi::Runtime &rt) {
  auto synchronizableUnpacker = getSynchronizableUnpacker(rt);
  auto ref = SerializableJSRef::newNativeStateObject(rt, this->shared_from_this());
  return synchronizableUnpacker.call(rt, std::move(ref));
}

Synchronizable::Synchronizable(const std::shared_ptr<Serializable> &value)
    : Serializable(ValueType::SynchronizableType), value_(value) {}

jsi::Function getSynchronizableUnpacker(jsi::Runtime &rt) {
  auto synchronizableUnpacker = rt.global().getProperty(rt, "__synchronizableUnpacker");
  react_native_assert(synchronizableUnpacker.isObject() && "synchronizableUnpacker not found");
  return synchronizableUnpacker.asObject(rt).asFunction(rt);
}

std::shared_ptr<Synchronizable> extractSynchronizableOrThrow(jsi::Runtime &rt, const jsi::Value &value) {
  auto serializable =
      extractSerializableOrThrow(rt, value, "[Worklets] Expecting the object to be of type SerializableJSRef.");

  auto synchronizable = std::dynamic_pointer_cast<Synchronizable>(serializable);
  react_native_assert(synchronizable != nullptr && "[Worklets] Expected the object to be a Synchronizable.");

  return synchronizable;
}

} // namespace worklets
