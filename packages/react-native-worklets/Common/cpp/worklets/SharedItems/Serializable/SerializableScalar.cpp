#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable/SerializableScalar.h>

#include <memory>
#include <stdexcept>

using namespace facebook;

namespace worklets {

jsi::Value SerializableScalar::toJSValue(jsi::Runtime &) {
  switch (valueType_) {
    case Serializable::ValueType::UndefinedType:
      return jsi::Value();
    case Serializable::ValueType::NullType:
      return jsi::Value(nullptr);
    case Serializable::ValueType::BooleanType:
      return jsi::Value(data_.boolean);
    case Serializable::ValueType::NumberType:
      return jsi::Value(data_.number);
    default:
      throw std::runtime_error("[Worklets] Attempted to convert object that's not of a scalar type.");
  }
}

jsi::Value makeSerializableNumber(jsi::Runtime &rt, double number) {
  const auto serializable = std::make_shared<SerializableScalar>(number);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableBoolean(jsi::Runtime &rt, bool boolean) {
  const auto serializable = std::make_shared<SerializableScalar>(boolean);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableUndefined(jsi::Runtime &rt) {
  const auto serializable = std::make_shared<SerializableScalar>();
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableNull(jsi::Runtime &rt) {
  const auto serializable = std::make_shared<SerializableScalar>(nullptr);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

} // namespace worklets
