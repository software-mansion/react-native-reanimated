#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>

#include <memory>

namespace worklets {

jsi::Value makeSerializableString(jsi::Runtime &rt, const jsi::String &string);

jsi::Value makeSerializableNumber(jsi::Runtime &rt, double number);

jsi::Value makeSerializableBoolean(jsi::Runtime &rt, bool boolean);

jsi::Value makeSerializableBigInt(jsi::Runtime &rt, const jsi::BigInt &bigint);

jsi::Value makeSerializableUndefined(jsi::Runtime &rt);

jsi::Value makeSerializableNull(jsi::Runtime &rt);

jsi::Value makeSerializableInitializer(jsi::Runtime &rt, const jsi::Object &initializerObject);

jsi::Value makeSerializableHostFunction(jsi::Runtime &rt, jsi::Function function);

jsi::Value makeSerializableRemoteFunction(jsi::Runtime &rt, jsi::Function function);

jsi::Value makeSerializableRemoteFunctionDev(jsi::Runtime &rt, jsi::Function function, jsi::String name);

jsi::Value makeSerializableImport(jsi::Runtime &rt, const double source, const jsi::String &imported);

jsi::Value makeSerializableArrayBuffer(jsi::Runtime &rt, const bool memoize, const jsi::ArrayBuffer &arrayBuffer);

jsi::Value
makeSerializableObject(jsi::Runtime &rt, const bool memoize, jsi::Object object, const jsi::Value &nativeStateSource);

jsi::Value
makeSerializableHostObject(jsi::Runtime &rt, const bool memoize, const std::shared_ptr<jsi::HostObject> &value);

jsi::Value makeSerializableTurboModuleLike(
    jsi::Runtime &rt,
    const bool memoize,
    const jsi::Object &object,
    const std::shared_ptr<jsi::HostObject> &proto);

jsi::Value makeSerializableMap(jsi::Runtime &rt, const bool memoize, const jsi::Array &keys, const jsi::Array &values);

jsi::Value makeSerializableSet(jsi::Runtime &rt, const bool memoize, const jsi::Array &values);

jsi::Value makeSerializableArray(jsi::Runtime &rt, const bool memoize, const jsi::Array &array);

jsi::Value makeSerializableWorklet(jsi::Runtime &rt, const bool memoize, const jsi::Object &object);

} // namespace worklets
