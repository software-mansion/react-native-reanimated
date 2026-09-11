#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableBigInt.h>

#include <memory>

using namespace facebook;

namespace worklets {

jsi::Value SerializableBigInt::toJSValue(jsi::Runtime &rt) {
  if (fastValue_.has_value()) {
    return jsi::BigInt::fromInt64(rt, fastValue_.value());
  } else {
    return rt.global().getPropertyAsFunction(rt, "BigInt").call(rt, jsi::String::createFromUtf8(rt, slowValue_));
  }
}

jsi::Value makeSerializableBigInt(jsi::Runtime &rt, const jsi::BigInt &bigint) {
  const auto serializable = std::make_shared<SerializableBigInt>(rt, bigint);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
