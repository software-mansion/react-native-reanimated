#include <worklets/SharedItems/Synchronizable.h>

#include <utility>

namespace worklets {

Synchronizable::Synchronizable() : Serializable(ValueType::SynchronizableType) {}

jsi::Value Synchronizable::toJSValue(jsi::Runtime &rt) {
  auto ref = SerializableJSRef::newNativeStateObject(rt, this->shared_from_this());
  return unpacker(rt).call(rt, std::move(ref));
}

} // namespace worklets
