#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable/CustomSerializable.h>

#include <memory>
#include <stdexcept>
#include <string>

using namespace facebook;

namespace worklets {

jsi::Function getCustomSerializableUnpacker(jsi::Runtime &rt) {
  auto customSerializableUnpacker = rt.global().getProperty(rt, "__customSerializableUnpacker");
  react_native_assert(customSerializableUnpacker.isObject() && "customSerializableUnpacker not found");
  return customSerializableUnpacker.asObject(rt).asFunction(rt);
}

jsi::Value CustomSerializable::toJSValue(jsi::Runtime &rt) {
  try {
    auto unpack = getCustomSerializableUnpacker(rt);
    auto data = data_->toJSValue(rt);

    return unpack.call(rt, data, jsi::Value(typeId_));
  } catch (jsi::JSError &e) {
    throw std::runtime_error(
        std::string("[Worklets] Failed to deserialize CustomSerializable. Reason: ") + e.getMessage());
  }
}

jsi::Value makeCustomSerializable(jsi::Runtime &rt, const jsi::Value &data, const int typeId) {
  auto rawData = extractSerializableOrThrow(rt, data, "[Worklets] Data must be a Serializable object.");
  auto customSerializable = std::make_shared<CustomSerializable>(rawData, typeId);
  return SerializableJSRef::newNativeStateObject(rt, customSerializable);
}

} // namespace worklets
