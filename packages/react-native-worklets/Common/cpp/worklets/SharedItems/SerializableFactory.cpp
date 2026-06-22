#include <jsi/jsi.h>
#include <worklets/SharedItems/SerializableFactory.h>
#include <worklets/SharedItems/SerializableRemoteFunction.h>

#include <memory>
#include <utility>

namespace worklets {

jsi::Value makeSerializableString(jsi::Runtime &rt, const jsi::String &string) {
  const auto serializable = std::make_shared<SerializableString>(string.utf8(rt));
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableNumber(jsi::Runtime &rt, double number) {
  const auto serializable = std::make_shared<SerializableScalar>(number);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableBoolean(jsi::Runtime &rt, bool boolean) {
  const auto serializable = std::make_shared<SerializableScalar>(boolean);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableBigInt(jsi::Runtime &rt, const jsi::BigInt &bigint) {
  const auto serializable = std::make_shared<SerializableBigInt>(rt, bigint);
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

jsi::Value makeSerializableWorklet(jsi::Runtime &rt, const jsi::Object &object, const bool &shouldRetainRemote) {
  std::shared_ptr<Serializable> serializable;
  if (shouldRetainRemote) {
    serializable = std::make_shared<RetainingSerializable<SerializableWorklet>>(rt, object);
  } else {
    serializable = std::make_shared<SerializableWorklet>(rt, object);
  }
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableInitializer(jsi::Runtime &rt, const jsi::Object &initializerObject) {
  const auto serializable = std::make_shared<SerializableInitializer>(rt, initializerObject);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableHostFunction(
    jsi::Runtime &rt,
    const jsi::HostFunctionType &function,
    const std::string &name,
    unsigned int paramCount) {
  auto serializable = std::make_shared<SerializableHostFunction>(function, name, paramCount);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeRNOriginSerializableRemoteFunction(
    jsi::Runtime &rnRuntime,
    const std::string &name,
    const int remoteId,
    const std::shared_ptr<JSScheduler> &jsScheduler) {
  auto serializable = std::make_shared<SerializableRemoteFunction::RNOrigin>(rnRuntime, name, remoteId, jsScheduler);
  return SerializableJSRef::newNativeStateObject(rnRuntime, serializable);
}

jsi::Value makeWorkletOriginSerializableRemoteFunction(
    jsi::Runtime &workletRuntime,
    const std::string &name,
    jsi::Function &&function,
    RuntimeData::RuntimeId hostRuntimeId) {
  auto serializable = std::make_shared<SerializableRemoteFunction::WorkletOrigin>(
      workletRuntime, name, std::move(function), hostRuntimeId);
  return SerializableJSRef::newNativeStateObject(workletRuntime, serializable);
}

jsi::Value makeSerializableArray(jsi::Runtime &rt, const jsi::Array &array, const jsi::Value &shouldRetainRemote) {
  std::shared_ptr<Serializable> serializable;
  if (shouldRetainRemote.isBool() && shouldRetainRemote.getBool()) {
    serializable = std::make_shared<RetainingSerializable<SerializableArray>>(rt, array);
  } else {
    serializable = std::make_shared<SerializableArray>(rt, array);
  }
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableArrayBuffer(
    jsi::Runtime &rt,
    const jsi::ArrayBuffer &arrayBuffer,
    std::optional<ArrayBufferMetadata> metadata) {
  auto serializable = std::make_shared<SerializableArrayBuffer>(rt, arrayBuffer, std::move(metadata));
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableMap(jsi::Runtime &rt, const jsi::Array &keys, const jsi::Array &values) {
  auto serializable = std::make_shared<SerializableMap>(rt, keys, values);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableSet(jsi::Runtime &rt, const jsi::Array &values) {
  auto serializable = std::make_shared<SerializableSet>(rt, values);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableError(
    jsi::Runtime &rt,
    const std::string &name,
    const std::string &message,
    const std::optional<std::string> &stack) {
  auto serializable = std::make_shared<SerializableError>(name, message, stack);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableRegExp(jsi::Runtime &rt, const std::string &pattern, const std::string &flags) {
  auto serializable = std::make_shared<SerializableRegExp>(pattern, flags);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableHostObject(jsi::Runtime &rt, const std::shared_ptr<jsi::HostObject> &value) {
  const auto serializable = std::make_shared<SerializableHostObject>(rt, value);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableTurboModuleLike(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const std::shared_ptr<jsi::HostObject> &proto) {
  const auto serializable = std::make_shared<SerializableTurboModuleLike>(rt, object, proto);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableImport(jsi::Runtime &rt, const double source, const jsi::String &imported) {
  auto serializable = std::make_shared<SerializableImport>(rt, source, imported);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableObject(
    jsi::Runtime &rt,
    jsi::Object object,
    bool shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  std::shared_ptr<Serializable> serializable;
  if (shouldRetainRemote) {
    serializable = std::make_shared<RetainingSerializable<SerializableObject>>(rt, object, nativeStateSource);
  } else {
    serializable = std::make_shared<SerializableObject>(rt, object, nativeStateSource);
  }
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeCustomSerializable(jsi::Runtime &rt, const jsi::Value &data, const int typeId) {
  auto rawData = extractSerializableOrThrow(rt, data, "[Worklets] Data must be a Serializable object.");
  auto customSerializable = std::make_shared<CustomSerializable>(rawData, typeId);
  return SerializableJSRef::newNativeStateObject(rt, customSerializable);
}

} // namespace worklets
