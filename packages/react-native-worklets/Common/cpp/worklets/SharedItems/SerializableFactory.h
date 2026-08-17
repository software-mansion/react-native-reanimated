#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>

#include <memory>
#include <optional>
#include <string>

namespace worklets {

class RNRuntimeStatus;

jsi::Value makeSerializableString(jsi::Runtime &rt, const jsi::String &string);

jsi::Value makeSerializableNumber(jsi::Runtime &rt, double number);

jsi::Value makeSerializableBoolean(jsi::Runtime &rt, bool boolean);

jsi::Value makeSerializableBigInt(jsi::Runtime &rt, const jsi::BigInt &bigint);

jsi::Value makeSerializableUndefined(jsi::Runtime &rt);

jsi::Value makeSerializableNull(jsi::Runtime &rt);

jsi::Value makeSerializableTurboModuleLike(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const std::shared_ptr<jsi::HostObject> &proto);

jsi::Value makeSerializableObject(
    jsi::Runtime &rt,
    jsi::Object object,
    bool shouldRetainRemote,
    const jsi::Value &nativeStateSource);

jsi::Value makeSerializableImport(jsi::Runtime &rt, double source, const jsi::String &imported);

jsi::Value makeSerializableHostObject(jsi::Runtime &rt, const std::shared_ptr<jsi::HostObject> &value);

jsi::Value makeSerializableArray(jsi::Runtime &rt, const jsi::Array &array, const jsi::Value &shouldRetainRemote);

jsi::Value makeSerializableArrayBuffer(
    jsi::Runtime &rt,
    const jsi::ArrayBuffer &arrayBuffer,
    std::optional<ArrayBufferMetadata> metadata = std::nullopt);

jsi::Value makeSerializableMap(jsi::Runtime &rt, const jsi::Array &keys, const jsi::Array &values);

jsi::Value makeSerializableSet(jsi::Runtime &rt, const jsi::Array &values);

jsi::Value makeSerializableError(
    jsi::Runtime &rt,
    const std::string &name,
    const std::string &message,
    const std::optional<std::string> &stack);

jsi::Value makeSerializableRegExp(jsi::Runtime &rt, const std::string &pattern, const std::string &flags);

jsi::Value makeSerializableInitializer(jsi::Runtime &rt, const jsi::Object &initializerObject);

jsi::Value makeSerializableHostFunction(
    jsi::Runtime &rt,
    const jsi::HostFunctionType &function,
    const std::string &name,
    unsigned int paramCount);

jsi::Value makeRNRuntimeSerializableRemoteFunction(
    jsi::Runtime &rnRuntime,
    const std::string &name,
    const jsi::Function &function,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<RNRuntimeStatus> &rnRuntimeStatus);

jsi::Value makeWorkletRuntimeSerializableRemoteFunction(
    jsi::Runtime &workletRuntime,
    const std::string &name,
    const jsi::Function &function,
    RuntimeData::RuntimeId hostRuntimeId);

jsi::Value makeSerializableWorklet(jsi::Runtime &rt, const jsi::Object &object, const bool &shouldRetainRemote);

jsi::Value makeCustomSerializable(jsi::Runtime &rt, const jsi::Value &data, int typeId);

} // namespace worklets
