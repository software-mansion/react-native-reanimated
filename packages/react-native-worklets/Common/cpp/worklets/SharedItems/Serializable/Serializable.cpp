#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable/RetainingSerializable.h>
#include <worklets/SharedItems/Serializable/Serializable.h>
#include <worklets/SharedItems/Serializable/SerializableArray.h>
#include <worklets/SharedItems/Serializable/SerializableArrayBuffer.h>
#include <worklets/SharedItems/Serializable/SerializableBigInt.h>
#include <worklets/SharedItems/Serializable/SerializableHostFunction.h>
#include <worklets/SharedItems/Serializable/SerializableHostObject.h>
#include <worklets/SharedItems/Serializable/SerializableInitializer.h>
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

jsi::Value makeSerializableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  std::shared_ptr<Serializable> serializable;
  if (value.isObject()) {
    auto object = value.asObject(rt);
    if (!object.getProperty(rt, "__workletHash").isUndefined()) {
      // We pass `false` because this function is invoked only
      // by `makeSerializableCloneOnUIRecursive` which doesn't
      // make Retaining Serializables.
      return makeSerializableWorklet(rt, object, false);
    } else if (!object.getProperty(rt, "__init").isUndefined()) {
      return makeSerializableInitializer(rt, object);
    } else if (object.isFunction(rt)) {
      auto fun = object.asFunction(rt);
      if (fun.isHostFunction(rt)) {
        auto name = fun.getProperty(rt, "name").asString(rt).utf8(rt);
        return makeSerializableHostFunction(
            rt, fun.getHostFunction(rt), name, fun.getProperty(rt, "length").asNumber());
      } else {
        throw std::runtime_error(
            "[Worklets] Cloning remote functions from Worklet Runtimes is only available in Bundle Mode.");
      }
    } else if (object.isArray(rt)) {
      if (shouldRetainRemote.isBool() && shouldRetainRemote.getBool()) {
        serializable = std::make_shared<RetainingSerializable<SerializableArray>>(rt, object.asArray(rt));
      } else {
        serializable = std::make_shared<SerializableArray>(rt, object.asArray(rt));
      }
    } else if (object.isArrayBuffer(rt)) {
      serializable = std::make_shared<SerializableArrayBuffer>(rt, object.getArrayBuffer(rt));
    } else if (object.isHostObject(rt)) {
      if (object.isHostObject<SerializableJSRef>(rt)) {
        return object;
      }
      serializable = std::make_shared<SerializableHostObject>(rt, object.getHostObject(rt));
    } else {
      if (shouldRetainRemote.isBool() && shouldRetainRemote.getBool()) {
        serializable = std::make_shared<RetainingSerializable<SerializableObject>>(rt, object, nativeStateSource);
      } else {
        serializable = std::make_shared<SerializableObject>(rt, object, nativeStateSource);
      }
    }
  } else if (value.isString()) {
    serializable = std::make_shared<SerializableString>(value.asString(rt).utf8(rt));
  } else if (value.isUndefined()) {
    serializable = std::make_shared<SerializableScalar>();
  } else if (value.isNull()) {
    serializable = std::make_shared<SerializableScalar>(nullptr);
  } else if (value.isBool()) {
    serializable = std::make_shared<SerializableScalar>(value.getBool());
  } else if (value.isNumber()) {
    serializable = std::make_shared<SerializableScalar>(value.getNumber());
  } else if (value.isBigInt()) {
    serializable = std::make_shared<SerializableBigInt>(rt, value.getBigInt(rt));
  } else if (value.isSymbol()) {
    // TODO: this is only a placeholder implementation, here we replace symbols
    // with strings in order to make certain objects to be captured. There isn't
    // yet any use-case for using symbols on the UI runtime so it is fine to keep
    // it like this for now.
    serializable = std::make_shared<SerializableString>(value.getSymbol(rt).toString(rt));
  } else {
    throw std::runtime_error("[Worklets] Attempted to convert an unsupported value type.");
  }
  return SerializableJSRef::newNativeStateObject(rt, serializable);
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
