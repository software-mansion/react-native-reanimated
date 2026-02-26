#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>

#include <memory>
#include <string>

namespace worklets {

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

jsi::Value makeSerializableMap(jsi::Runtime &rt, const jsi::Array &keys, const jsi::Array &values);

jsi::Value makeSerializableSet(jsi::Runtime &rt, const jsi::Array &values);

jsi::Value makeSerializableInitializer(jsi::Runtime &rt, const jsi::Object &initializerObject);

jsi::Value makeSerializableFunction(jsi::Runtime &rt, jsi::Function function);

jsi::Value makeSerializableWorklet(jsi::Runtime &rt, const jsi::Object &object, const bool &shouldRetainRemote);

jsi::Value makeCustomSerializable(jsi::Runtime &rt, const jsi::Value &data, int typeId);

} // namespace worklets
