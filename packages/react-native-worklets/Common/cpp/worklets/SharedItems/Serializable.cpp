#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>

#include <memory>
#include <string>
#include <utility>

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
      return makeSerializableFunction(rt, object.asFunction(rt));
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

jsi::Value makeSerializableFunction(jsi::Runtime &rt, jsi::Function function) {
  std::shared_ptr<Serializable> serializable;
  if (function.isHostFunction(rt)) {
    serializable = std::make_shared<SerializableHostFunction>(rt, std::move(function));
  } else {
    serializable = std::make_shared<SerializableRemoteFunction>(rt, std::move(function));
  }
  return SerializableJSRef::newNativeStateObject(rt, serializable);
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

jsi::Value makeSerializableMap(jsi::Runtime &rt, const jsi::Array &keys, const jsi::Array &values) {
  auto serializable = std::make_shared<SerializableMap>(rt, keys, values);
  return SerializableJSRef::newNativeStateObject(rt, serializable);
}

jsi::Value makeSerializableSet(jsi::Runtime &rt, const jsi::Array &values) {
  auto serializable = std::make_shared<SerializableSet>(rt, values);
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

std::shared_ptr<Serializable> extractSerializableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &maybeSerializableValue,
    const std::string &errorMessage) {
  if (maybeSerializableValue.isObject()) {
    auto object = maybeSerializableValue.asObject(rt);
    if (object.hasNativeState(rt)) {
      auto nativeState = object.getNativeState(rt);
      return std::dynamic_pointer_cast<SerializableJSRef>(nativeState)->value();
    }
    throw std::runtime_error("[Worklets] Attempted to extract from a Object that wasn't converted to a Serializable.");
  } else if (maybeSerializableValue.isUndefined()) {
    return Serializable::undefined();
  }
  throw std::runtime_error(errorMessage);
}

Serializable::~Serializable() = default;

std::shared_ptr<Serializable> Serializable::undefined() {
  static auto undefined = std::make_shared<SerializableScalar>();
  return undefined;
}

template <typename BaseClass>
jsi::Value RetainingSerializable<BaseClass>::toJSValue(jsi::Runtime &rt) {
  if (&rt == primaryRuntime_) {
    // TODO: it is suboptimal to generate new object every time getJS is
    // called on host runtime – the objects we are generating already exists
    // and we should possibly just grab a hold of such object and use it here
    // instead of creating a new JS representation. As far as I understand the
    // only case where it can be realistically called this way is when a
    // shared value is created and then accessed on the same runtime
    return BaseClass::toJSValue(rt);
  }
  if (secondaryValue_ == nullptr) {
    auto value = BaseClass::toJSValue(rt);
    secondaryValue_ = std::make_unique<jsi::Value>(rt, value);
    secondaryRuntime_ = &rt;
    return value;
  }
  if (&rt == secondaryRuntime_) {
    return jsi::Value(rt, *secondaryValue_);
  }
  return BaseClass::toJSValue(rt);
}

SerializableJSRef::~SerializableJSRef() = default;

SerializableArray::SerializableArray(jsi::Runtime &rt, const jsi::Array &array) : Serializable(ValueType::ArrayType) {
  auto size = array.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    data_.push_back(extractSerializableOrThrow(rt, array.getValueAtIndex(rt, i)));
  }
}

jsi::Value SerializableArray::toJSValue(jsi::Runtime &rt) {
  auto size = data_.size();
  auto ary = jsi::Array(rt, size);
  for (size_t i = 0; i < size; i++) {
    ary.setValueAtIndex(rt, i, data_[i]->toJSValue(rt));
  }
  return ary;
}

jsi::Value SerializableArrayBuffer::toJSValue(jsi::Runtime &rt) {
  auto size = static_cast<int>(data_.size());
  auto arrayBuffer =
      rt.global().getPropertyAsFunction(rt, "ArrayBuffer").callAsConstructor(rt, size).getObject(rt).getArrayBuffer(rt);
  memcpy(arrayBuffer.data(rt), data_.data(), size);
  return arrayBuffer;
}

SerializableObject::SerializableObject(jsi::Runtime &rt, const jsi::Object &object)
    : Serializable(ValueType::ObjectType) {
  auto propertyNames = object.getPropertyNames(rt);
  auto size = propertyNames.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    auto key = propertyNames.getValueAtIndex(rt, i).asString(rt);
    auto value = extractSerializableOrThrow(rt, object.getProperty(rt, key));
    data_.emplace_back(key.utf8(rt), value);
  }
  if (object.hasNativeState(rt)) {
    nativeState_ = object.getNativeState(rt);
  }
}

SerializableObject::SerializableObject(jsi::Runtime &rt, const jsi::Object &object, const jsi::Value &nativeStateSource)
    : SerializableObject(rt, object) {
  if (nativeStateSource.isObject() && nativeStateSource.asObject(rt).hasNativeState(rt)) {
    nativeState_ = nativeStateSource.asObject(rt).getNativeState(rt);
  }
}

jsi::Value SerializableObject::toJSValue(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
  for (const auto &i : data_) {
    obj.setProperty(rt, jsi::String::createFromUtf8(rt, i.first), i.second->toJSValue(rt));
  }
  if (nativeState_ != nullptr) {
    obj.setNativeState(rt, nativeState_);
  }
  return obj;
}

SerializableMap::SerializableMap(jsi::Runtime &rt, const jsi::Array &keys, const jsi::Array &values)
    : Serializable(ValueType::MapType) {
  auto size = keys.size(rt);
  react_native_assert(size == values.size(rt) && "Keys and values arrays must have the same size.");
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    auto key = extractSerializableOrThrow(rt, keys.getValueAtIndex(rt, i));
    auto value = extractSerializableOrThrow(rt, values.getValueAtIndex(rt, i));
    data_.emplace_back(key, value);
  }
}

jsi::Value SerializableMap::toJSValue(jsi::Runtime &rt) {
  const auto keyValues = jsi::Array(rt, data_.size());
  for (size_t i = 0, size = data_.size(); i < size; i++) {
    const auto pair = jsi::Array(rt, 2);
    pair.setValueAtIndex(rt, 0, data_[i].first->toJSValue(rt));
    pair.setValueAtIndex(rt, 1, data_[i].second->toJSValue(rt));
    keyValues.setValueAtIndex(rt, i, std::move(pair));
  }

  const auto &global = rt.global();
  auto map = global.getPropertyAsFunction(rt, "Map").callAsConstructor(rt, std::move(keyValues));

  return map;
}

SerializableSet::SerializableSet(jsi::Runtime &rt, const jsi::Array &values) : Serializable(ValueType::SetType) {
  auto size = values.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    data_.push_back(extractSerializableOrThrow(rt, values.getValueAtIndex(rt, i)));
  }
}

jsi::Value SerializableSet::toJSValue(jsi::Runtime &rt) {
  const auto values = jsi::Array(rt, data_.size());
  for (size_t i = 0, size = data_.size(); i < size; i++) {
    values.setValueAtIndex(rt, i, data_[i]->toJSValue(rt));
  }

  const auto &global = rt.global();
  auto set = global.getPropertyAsFunction(rt, "Set").callAsConstructor(rt, std::move(values));

  return set;
}

jsi::Value SerializableHostObject::toJSValue(jsi::Runtime &rt) {
  return jsi::Object::createFromHostObject(rt, hostObject_);
}

jsi::Value SerializableHostFunction::toJSValue(jsi::Runtime &rt) {
  return jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forUtf8(rt, name_), paramCount_, hostFunction_);
}

jsi::Value SerializableWorklet::toJSValue(jsi::Runtime &rt) {
  react_native_assert(
      std::any_of(data_.cbegin(), data_.cend(), [](const auto &item) { return item.first == "__workletHash"; }) &&
      "SerializableWorklet doesn't have `__workletHash` property");
  jsi::Value obj = SerializableObject::toJSValue(rt);
  return getValueUnpacker(rt).call(rt, obj, jsi::String::createFromAscii(rt, "Worklet"));
}

jsi::Value SerializableImport::toJSValue(jsi::Runtime &rt) {
  /**
   * The only way to obtain a module in runtime is to use the Metro's require
   * method implementation, which is injected into the global object as `__r`.
   */
  const auto metroRequire = rt.global().getProperty(rt, "__r");
  if (metroRequire.isUndefined()) {
    return jsi::Value::undefined();
  }

  const auto imported = jsi::String::createFromUtf8(rt, imported_);
  return metroRequire.asObject(rt).asFunction(rt).call(rt, source_).asObject(rt).getProperty(rt, imported);
}

jsi::Value SerializableRemoteFunction::toJSValue(jsi::Runtime &rt) {
  if (&rt == runtime_) {
    return jsi::Value(rt, *function_);
  } else {
#ifndef NDEBUG
    return getValueUnpacker(rt).call(
        rt,
        SerializableJSRef::newNativeStateObject(rt, shared_from_this()),
        jsi::String::createFromAscii(rt, "RemoteFunction"),
        jsi::String::createFromUtf8(rt, name_));
#else
    return SerializableJSRef::newNativeStateObject(rt, shared_from_this());
#endif
  }
}

jsi::Value SerializableInitializer::toJSValue(jsi::Runtime &rt) {
  if (remoteValue_ == nullptr) {
    auto initObj = initializer_->toJSValue(rt);
    auto value = std::make_unique<jsi::Value>(
        getValueUnpacker(rt).call(rt, initObj, jsi::String::createFromAscii(rt, "Handle")));

    // We are locking the initialization here since the thread that is
    // initializing can be preempted on runtime lock. E.g.
    // UI thread can be preempted on initialization of a shared value and then
    // JS thread can try to access the shared value, locking the whole runtime.
    // If we put the lock on `getValueUnpacker` part (basically any part that
    // requires runtime) we would get a deadlock since UI thread would never
    // release it.
    std::unique_lock<std::mutex> lock(initializationMutex_);
    if (remoteValue_ == nullptr) {
      remoteValue_ = std::move(value);
      remoteRuntime_ = &rt;
    }
  }
  if (&rt == remoteRuntime_) {
    return jsi::Value(rt, *remoteValue_);
  }
  auto initObj = initializer_->toJSValue(rt);
  return getValueUnpacker(rt).call(rt, initObj, jsi::String::createFromAscii(rt, "Handle"));
}

jsi::Value SerializableString::toJSValue(jsi::Runtime &rt) {
  return jsi::String::createFromUtf8(rt, data_);
}

jsi::Value SerializableBigInt::toJSValue(jsi::Runtime &rt) {
  if (fastValue_.has_value()) {
    return jsi::BigInt::fromInt64(rt, fastValue_.value());
  } else {
    return rt.global().getPropertyAsFunction(rt, "BigInt").call(rt, jsi::String::createFromUtf8(rt, slowValue_));
  }
}

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

jsi::Value SerializableTurboModuleLike::toJSValue(jsi::Runtime &rt) {
  auto obj = properties_->toJSValue(rt).asObject(rt);
  const auto prototype = proto_->toJSValue(rt);
  rt.global().getPropertyAsObject(rt, "Object").getPropertyAsFunction(rt, "setPrototypeOf").call(rt, obj, prototype);

  return obj;
}

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
