#include <jsi/jsi.h>
#include <worklets/SharedItems/SerializableFactory.h>

#include <memory>

namespace worklets {

template <std::derived_from<Serializable> TSerializable, typename... TArgs>
jsi::Value serializableFactory(jsi::Runtime &rt, TArgs &&...args) {
  if constexpr (std::is_constructible_v<TSerializable, jsi::Runtime &, TArgs...>) {
    const auto serializable = std::make_shared<TSerializable>(rt, std::forward<TArgs>(args)...);
    return SerializableJSRef::newNativeStateObject(rt, serializable);
  } else {
    const auto serializable = std::make_shared<TSerializable>(std::forward<TArgs>(args)...);
    return SerializableJSRef::newNativeStateObject(rt, serializable);
  }
}

// template <std::derived_from<Serializable> TSerializable, typename... TArgs>
// jsi::Value inline serializableFactory(jsi::Runtime &rt, TArgs &&...args) {
//   const auto serializable = std::make_shared<SerializableScalar>(std::forward<TArgs>(args)...);
//   return SerializableJSRef::newNativeStateObject(rt, serializable);
// }

template <std::derived_from<Serializable> TSerializable, typename... TArgs>
jsi::Value inline memoizedSerializableFactory(jsi::Runtime &rt, TArgs &&...args) {
  const auto serializable = std::make_shared<RetainingSerializable<TSerializable>>(rt, std::forward<TArgs>(args)...);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

template <std::derived_from<Serializable> TSerializable, typename... TArgs>
jsi::Value inline memoizableSerializableFactory(jsi::Runtime &rt, const bool memoize, TArgs &&...args) {
  if (memoize) {
    return memoizedSerializableFactory<TSerializable>(rt, std::forward<TArgs>(args)...);
  } else {
    return serializableFactory<TSerializable>(rt, std::forward<TArgs>(args)...);
  }
}

jsi::Value makeSerializableString(jsi::Runtime &rt, const jsi::String &string) {
  return serializableFactory<SerializableString>(rt, string.utf8(rt));
}

jsi::Value makeSerializableNumber(jsi::Runtime &rt, double number) {
  return serializableFactory<SerializableScalar>(rt, number);
}

jsi::Value makeSerializableBoolean(jsi::Runtime &rt, bool boolean) {
  return serializableFactory<SerializableScalar>(rt, boolean);
}

jsi::Value makeSerializableBigInt(jsi::Runtime &rt, const jsi::BigInt &bigint) {
  return serializableFactory<SerializableBigInt>(rt, bigint);
}

jsi::Value makeSerializableUndefined(jsi::Runtime &rt) {
  return serializableFactory<SerializableScalar>(rt);
}

jsi::Value makeSerializableNull(jsi::Runtime &rt) {
  return serializableFactory<SerializableScalar>(rt, nullptr);
}

jsi::Value makeSerializableInitializer(jsi::Runtime &rt, const jsi::Object &initializerObject) {
  return serializableFactory<SerializableInitializer>(rt, initializerObject);
}

// TODO: use jsi::HostFunctionType directly
jsi::Value makeSerializableHostFunction(jsi::Runtime &rt, jsi::Function function) {
  return serializableFactory<SerializableHostFunction>(rt, std::move(function));
}

jsi::Value makeSerializableRemoteFunction(jsi::Runtime &rt, jsi::Function function) {
  return serializableFactory<SerializableRemoteFunction>(rt, std::move(function));
}

jsi::Value makeSerializableRemoteFunctionDev(jsi::Runtime &rt, jsi::Function function, jsi::String name) {
  return serializableFactory<SerializableRemoteFunctionDev>(rt, std::move(function), std::move(name));
}

jsi::Value makeSerializableImport(jsi::Runtime &rt, const double source, const jsi::String &imported) {
  return serializableFactory<SerializableImport>(rt, source, imported);
}

jsi::Value makeSerializableArrayBuffer(jsi::Runtime &rt, const bool memoize, const jsi::ArrayBuffer &arrayBuffer) {
  return memoizableSerializableFactory<SerializableArrayBuffer>(rt, memoize, arrayBuffer);
}

jsi::Value
makeSerializableObject(jsi::Runtime &rt, const bool memoize, jsi::Object object, const jsi::Value &nativeStateSource) {
  return memoizableSerializableFactory<SerializableObject>(rt, memoize, object, nativeStateSource);
}

jsi::Value
makeSerializableHostObject(jsi::Runtime &rt, const bool memoize, const std::shared_ptr<jsi::HostObject> &value) {
  return memoizableSerializableFactory<SerializableHostObject>(rt, memoize, value);
}

jsi::Value makeSerializableTurboModuleLike(
    jsi::Runtime &rt,
    const bool memoize,
    const jsi::Object &object,
    const std::shared_ptr<jsi::HostObject> &proto) {
  return memoizableSerializableFactory<SerializableTurboModuleLike>(rt, memoize, object, proto);
}

jsi::Value makeSerializableMap(jsi::Runtime &rt, const bool memoize, const jsi::Array &keys, const jsi::Array &values) {
  return memoizableSerializableFactory<SerializableMap>(rt, memoize, keys, values);
}

jsi::Value makeSerializableSet(jsi::Runtime &rt, const bool memoize, const jsi::Array &values) {
  return memoizableSerializableFactory<SerializableSet>(rt, memoize, values);
}

jsi::Value makeSerializableArray(jsi::Runtime &rt, const bool memoize, const jsi::Array &array) {
  return memoizableSerializableFactory<SerializableArray>(rt, memoize, array);
}

jsi::Value makeSerializableWorklet(jsi::Runtime &rt, const bool memoize, const jsi::Object &object) {
  return memoizableSerializableFactory<SerializableWorklet>(rt, memoize, object);
}
// #endregion

} // namespace worklets
