#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Synchronizable.h>

#include <utility>

namespace worklets {

Synchronizable::Synchronizable(bool isFixed) : Serializable(ValueType::SynchronizableType), isFixed_(isFixed) {}

jsi::Value Synchronizable::toJSValue(jsi::Runtime &rt) {
  auto synchronizableUnpacker = rt.global().getProperty(rt, "__synchronizableUnpacker");
  react_native_assert(synchronizableUnpacker.isObject() && "synchronizableUnpacker not found");
  auto ref = SerializableJSRef::newNativeStateObject(rt, this->shared_from_this());
  return synchronizableUnpacker.getObject(rt).getFunction(rt).call(rt, std::move(ref), jsi::Value(isFixed()));
}

} // namespace worklets
