#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable/RetainingSerializable.h>
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/SharedItems/Serializable/SerializableArray.h>
#include <worklets/SharedItems/Serializable/SerializableArrayBuffer.h>
#include <worklets/SharedItems/Serializable/SerializableBigInt.h>
#include <worklets/SharedItems/Serializable/SerializableHostFunction.h>
#include <worklets/SharedItems/Serializable/SerializableHostObject.h>
#include <worklets/SharedItems/Serializable/SerializableObject.h>
#include <worklets/SharedItems/Serializable/SerializableScalar.h>
#include <worklets/SharedItems/Serializable/SerializableString.h>
#include <worklets/SharedItems/Serializable/SerializableWorklet.h>

#include <memory>
#include <stdexcept>
#include <string>

using namespace facebook;

namespace worklets {

jsi::Function getValueUnpacker(jsi::Runtime &rt) {
  auto valueUnpacker = rt.global().getProperty(rt, "__valueUnpacker");
  react_native_assert(valueUnpacker.isObject() && "valueUnpacker not found");
  return valueUnpacker.asObject(rt).asFunction(rt);
}

std::shared_ptr<Serializable> extractSerializableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &maybeSerializableValue,
    const std::string &errorMessage) {
  if (maybeSerializableValue.isObject()) {
    auto object = maybeSerializableValue.getObject(rt);
    return extractSerializableOrThrow(rt, object, errorMessage);
  } else if (maybeSerializableValue.isUndefined()) {
    return Serializable::undefined();
  }
  throw std::runtime_error(errorMessage);
}

std::shared_ptr<Serializable> extractSerializableOrThrow(
    jsi::Runtime &rt,
    const jsi::Object &maybeSerializableValue,
    const std::string &errorMessage) {
  if (maybeSerializableValue.hasNativeState(rt)) {
    auto nativeState = maybeSerializableValue.getNativeState(rt);
    return std::dynamic_pointer_cast<SerializableJSRef>(nativeState)->value();
  }
  throw std::runtime_error(errorMessage);
}

Serializable::~Serializable() = default;

std::shared_ptr<Serializable> Serializable::undefined() {
  static auto undefined = std::make_shared<SerializableScalar>();
  return undefined;
}

SerializableJSRef::~SerializableJSRef() = default;

} // namespace worklets
