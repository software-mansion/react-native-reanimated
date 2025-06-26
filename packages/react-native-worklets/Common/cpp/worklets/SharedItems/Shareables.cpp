#include <jsi/jsi.h>
#include <worklets/SharedItems/Shareables.h>

using namespace facebook;

namespace worklets {

jsi::Function getValueUnpacker(jsi::Runtime &rt) {
  auto valueUnpacker = rt.global().getProperty(rt, "__valueUnpacker");
  react_native_assert(valueUnpacker.isObject() && "valueUnpacker not found");
  return valueUnpacker.asObject(rt).asFunction(rt);
}

#ifndef NDEBUG

static const auto callGuardLambda = [](facebook::jsi::Runtime &rt,
                                       const facebook::jsi::Value &thisVal,
                                       const facebook::jsi::Value *args,
                                       size_t count) {
  return args[0].asObject(rt).asFunction(rt).call(rt, args + 1, count - 1);
};

jsi::Function getCallGuard(jsi::Runtime &rt) {
  auto callGuard = rt.global().getProperty(rt, "__callGuardDEV");
  if (callGuard.isObject()) {
    // Use JS implementation if `__callGuardDEV` has already been installed.
    // This is the desired behavior.
    return callGuard.asObject(rt).asFunction(rt);
  }

  // Otherwise, fallback to C++ JSI implementation. This is necessary so that we
  // can install `__callGuardDEV` itself and should happen only once. Note that
  // the C++ implementation doesn't intercept errors and simply throws them as
  // C++ exceptions which crashes the app. We assume that installing the guard
  // doesn't throw any errors.
  return jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forAscii(rt, "callGuard"), 1, callGuardLambda);
}

#endif // NDEBUG

jsi::Value makeShareableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  std::shared_ptr<Shareable> shareable;
  if (value.isObject()) {
    auto object = value.asObject(rt);
    if (!object.getProperty(rt, "__workletHash").isUndefined()) {
      // We pass `false` because this function is invoked only
      // by `makeShareableCloneOnUIRecursive` which doesn't
      // make Retaining Shareables.
      return makeShareableWorklet(rt, object, false);
    } else if (!object.getProperty(rt, "__init").isUndefined()) {
      return makeShareableInitializer(rt, object);
    } else if (object.isFunction(rt)) {
      return makeShareableFunction(rt, object.asFunction(rt));
    } else if (object.isArray(rt)) {
      if (shouldRetainRemote.isBool() && shouldRetainRemote.getBool()) {
        shareable = std::make_shared<RetainingShareable<ShareableArray>>(
            rt, object.asArray(rt));
      } else {
        shareable = std::make_shared<ShareableArray>(rt, object.asArray(rt));
      }
    } else if (object.isArrayBuffer(rt)) {
      shareable =
          std::make_shared<ShareableArrayBuffer>(rt, object.getArrayBuffer(rt));
    } else if (object.isHostObject(rt)) {
      if (object.isHostObject<ShareableJSRef>(rt)) {
        return object;
      }
      shareable =
          std::make_shared<ShareableHostObject>(rt, object.getHostObject(rt));
    } else {
      if (shouldRetainRemote.isBool() && shouldRetainRemote.getBool()) {
        shareable = std::make_shared<RetainingShareable<ShareableObject>>(
            rt, object, nativeStateSource);
      } else {
        shareable =
            std::make_shared<ShareableObject>(rt, object, nativeStateSource);
      }
    }
  } else if (value.isString()) {
    shareable = std::make_shared<ShareableString>(value.asString(rt).utf8(rt));
  } else if (value.isUndefined()) {
    shareable = std::make_shared<ShareableScalar>();
  } else if (value.isNull()) {
    shareable = std::make_shared<ShareableScalar>(nullptr);
  } else if (value.isBool()) {
    shareable = std::make_shared<ShareableScalar>(value.getBool());
  } else if (value.isNumber()) {
    shareable = std::make_shared<ShareableScalar>(value.getNumber());
  } else if (value.isBigInt()) {
    shareable = std::make_shared<ShareableBigInt>(rt, value.getBigInt(rt));
  } else if (value.isSymbol()) {
    // TODO: this is only a placeholder implementation, here we replace symbols
    // with strings in order to make certain objects to be captured. There isn't
    // yet any usecase for using symbols on the UI runtime so it is fine to keep
    // it like this for now.
    shareable =
        std::make_shared<ShareableString>(value.getSymbol(rt).toString(rt));
  } else {
    throw std::runtime_error(
        "[Worklets] Attempted to convert an unsupported value type.");
  }
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableString(jsi::Runtime &rt, const jsi::String &string) {
  const auto shareable = std::make_shared<ShareableString>(string.utf8(rt));
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableNumber(jsi::Runtime &rt, double number) {
  const auto shareable = std::make_shared<ShareableScalar>(number);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableBoolean(jsi::Runtime &rt, bool boolean) {
  const auto shareable = std::make_shared<ShareableScalar>(boolean);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableBigInt(jsi::Runtime &rt, const jsi::BigInt &bigint) {
  const auto shareable = std::make_shared<ShareableBigInt>(rt, bigint);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableUndefined(jsi::Runtime &rt) {
  const auto shareable = std::make_shared<ShareableScalar>();
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableNull(jsi::Runtime &rt) {
  const auto shareable = std::make_shared<ShareableScalar>(nullptr);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableWorklet(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const bool &shouldRetainRemote) {
  std::shared_ptr<Shareable> shareable;
  if (shouldRetainRemote) {
    shareable =
        std::make_shared<RetainingShareable<ShareableWorklet>>(rt, object);
  } else {
    shareable = std::make_shared<ShareableWorklet>(rt, object);
  }
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableInitializer(
    jsi::Runtime &rt,
    const jsi::Object &initializerObject) {
  const auto shareable =
      std::make_shared<ShareableInitializer>(rt, initializerObject);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableFunction(jsi::Runtime &rt, jsi::Function function) {
  std::shared_ptr<Shareable> shareable;
  if (function.isHostFunction(rt)) {
    shareable =
        std::make_shared<ShareableHostFunction>(rt, std::move(function));
  } else {
    shareable =
        std::make_shared<ShareableRemoteFunction>(rt, std::move(function));
  }
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableArray(
    jsi::Runtime &rt,
    const jsi::Array &array,
    const jsi::Value &shouldRetainRemote) {
  std::shared_ptr<Shareable> shareable;
  if (shouldRetainRemote.isBool() && shouldRetainRemote.getBool()) {
    shareable = std::make_shared<RetainingShareable<ShareableArray>>(rt, array);
  } else {
    shareable = std::make_shared<ShareableArray>(rt, array);
  }
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableMap(
    jsi::Runtime &rt,
    const jsi::Array &keys,
    const jsi::Array &values) {
  auto shareable = std::make_shared<ShareableMap>(rt, keys, values);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableSet(jsi::Runtime &rt, const jsi::Array &values) {
  auto shareable = std::make_shared<ShareableSet>(rt, values);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableHostObject(
    jsi::Runtime &rt,
    const std::shared_ptr<jsi::HostObject> &value) {
  const auto shareable = std::make_shared<ShareableHostObject>(rt, value);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableTurboModuleLike(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const std::shared_ptr<jsi::HostObject> &proto) {
  const auto shareable =
      std::make_shared<ShareableTurboModuleLike>(rt, object, proto);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableImport(
    jsi::Runtime &rt,
    const double source,
    const jsi::String &imported) {
  auto shareable = std::make_shared<ShareableImport>(rt, source, imported);
  return ShareableJSRef::newHostObject(rt, shareable);
}

jsi::Value makeShareableObject(
    jsi::Runtime &rt,
    jsi::Object object,
    bool shouldRetainRemote,
    const jsi::Value &nativeStateSource) {
  std::shared_ptr<Shareable> shareable;
  if (shouldRetainRemote) {
    shareable = std::make_shared<RetainingShareable<ShareableObject>>(
        rt, object, nativeStateSource);
  } else {
    shareable =
        std::make_shared<ShareableObject>(rt, object, nativeStateSource);
  }
  return ShareableJSRef::newHostObject(rt, shareable);
}

std::shared_ptr<Shareable> extractShareableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &maybeShareableValue,
    const std::string &errorMessage) {
  if (maybeShareableValue.isObject()) {
    auto object = maybeShareableValue.asObject(rt);
    if (object.isHostObject<ShareableJSRef>(rt)) {
      return object.getHostObject<ShareableJSRef>(rt)->value();
    }
    throw std::runtime_error(
        "[Worklets] Attempted to extract from a HostObject that wasn't converted to a Shareable.");
  } else if (maybeShareableValue.isUndefined()) {
    return Shareable::undefined();
  }
  throw std::runtime_error(errorMessage);
}

Shareable::~Shareable() {}

std::shared_ptr<Shareable> Shareable::undefined() {
  static auto undefined = std::make_shared<ShareableScalar>();
  return undefined;
}

template <typename BaseClass>
jsi::Value RetainingShareable<BaseClass>::toJSValue(jsi::Runtime &rt) {
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

ShareableJSRef::~ShareableJSRef() {}

ShareableArray::ShareableArray(jsi::Runtime &rt, const jsi::Array &array)
    : Shareable(ArrayType) {
  auto size = array.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    data_.push_back(extractShareableOrThrow(rt, array.getValueAtIndex(rt, i)));
  }
}

jsi::Value ShareableArray::toJSValue(jsi::Runtime &rt) {
  auto size = data_.size();
  auto ary = jsi::Array(rt, size);
  for (size_t i = 0; i < size; i++) {
    ary.setValueAtIndex(rt, i, data_[i]->toJSValue(rt));
  }
  return ary;
}

jsi::Value ShareableArrayBuffer::toJSValue(jsi::Runtime &rt) {
  auto size = static_cast<int>(data_.size());
  auto arrayBuffer = rt.global()
                         .getPropertyAsFunction(rt, "ArrayBuffer")
                         .callAsConstructor(rt, size)
                         .getObject(rt)
                         .getArrayBuffer(rt);
  memcpy(arrayBuffer.data(rt), data_.data(), size);
  return arrayBuffer;
}

ShareableObject::ShareableObject(jsi::Runtime &rt, const jsi::Object &object)
    : Shareable(ObjectType) {
  auto propertyNames = object.getPropertyNames(rt);
  auto size = propertyNames.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    auto key = propertyNames.getValueAtIndex(rt, i).asString(rt);
    auto value = extractShareableOrThrow(rt, object.getProperty(rt, key));
    data_.emplace_back(key.utf8(rt), value);
  }
  if (object.hasNativeState(rt)) {
    nativeState_ = object.getNativeState(rt);
  }
}

ShareableObject::ShareableObject(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const jsi::Value &nativeStateSource)
    : ShareableObject(rt, object) {
  if (nativeStateSource.isObject() &&
      nativeStateSource.asObject(rt).hasNativeState(rt)) {
    nativeState_ = nativeStateSource.asObject(rt).getNativeState(rt);
  }
}

jsi::Value ShareableObject::toJSValue(jsi::Runtime &rt) {
  auto obj = jsi::Object(rt);
  for (size_t i = 0, size = data_.size(); i < size; i++) {
    obj.setProperty(
        rt,
        jsi::String::createFromUtf8(rt, data_[i].first),
        data_[i].second->toJSValue(rt));
  }
  if (nativeState_ != nullptr) {
    obj.setNativeState(rt, nativeState_);
  }
  return obj;
}

ShareableMap::ShareableMap(
    jsi::Runtime &rt,
    const jsi::Array &keys,
    const jsi::Array &values)
    : Shareable(MapType) {
  auto size = keys.size(rt);
  react_native_assert(
      size == values.size(rt) &&
      "Keys and values arrays must have the same size.");
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    auto key = extractShareableOrThrow(rt, keys.getValueAtIndex(rt, i));
    auto value = extractShareableOrThrow(rt, values.getValueAtIndex(rt, i));
    data_.emplace_back(key, value);
  }
}

jsi::Value ShareableMap::toJSValue(jsi::Runtime &rt) {
  const auto keyValues = jsi::Array(rt, data_.size());
  for (size_t i = 0, size = data_.size(); i < size; i++) {
    const auto pair = jsi::Array(rt, 2);
    pair.setValueAtIndex(rt, 0, data_[i].first->toJSValue(rt));
    pair.setValueAtIndex(rt, 1, data_[i].second->toJSValue(rt));
    keyValues.setValueAtIndex(rt, i, std::move(pair));
  }

  const auto &global = rt.global();
  auto map = global.getPropertyAsFunction(rt, "Map").callAsConstructor(
      rt, std::move(keyValues));

  return map;
}

ShareableSet::ShareableSet(jsi::Runtime &rt, const jsi::Array &values)
    : Shareable(SetType) {
  auto size = values.size(rt);
  data_.reserve(size);
  for (size_t i = 0; i < size; i++) {
    data_.push_back(extractShareableOrThrow(rt, values.getValueAtIndex(rt, i)));
  }
}

jsi::Value ShareableSet::toJSValue(jsi::Runtime &rt) {
  const auto values = jsi::Array(rt, data_.size());
  for (size_t i = 0, size = data_.size(); i < size; i++) {
    values.setValueAtIndex(rt, i, data_[i]->toJSValue(rt));
  }

  const auto &global = rt.global();
  auto set = global.getPropertyAsFunction(rt, "Set").callAsConstructor(
      rt, std::move(values));

  return set;
}

jsi::Value ShareableHostObject::toJSValue(jsi::Runtime &rt) {
  return jsi::Object::createFromHostObject(rt, hostObject_);
}

jsi::Value ShareableHostFunction::toJSValue(jsi::Runtime &rt) {
  return jsi::Function::createFromHostFunction(
      rt, jsi::PropNameID::forUtf8(rt, name_), paramCount_, hostFunction_);
}

jsi::Value ShareableWorklet::toJSValue(jsi::Runtime &rt) {
  react_native_assert(
      std::any_of(
          data_.cbegin(),
          data_.cend(),
          [](const auto &item) { return item.first == "__workletHash"; }) &&
      "ShareableWorklet doesn't have `__workletHash` property");
  jsi::Value obj = ShareableObject::toJSValue(rt);
  return getValueUnpacker(rt).call(
      rt, obj, jsi::String::createFromAscii(rt, "Worklet"));
}

jsi::Value ShareableImport::toJSValue(jsi::Runtime &rt) {
  /**
   * The only way to obtain a module in runtime is to use the Metro's require
   * method implementation, which is injected into the global object as `__r`.
   */
  const auto metroRequire = rt.global().getProperty(rt, "__r");
  if (metroRequire.isUndefined()) {
    return jsi::Value::undefined();
  }

  const auto imported = jsi::String::createFromUtf8(rt, imported_);
  return metroRequire.asObject(rt)
      .asFunction(rt)
      .call(rt, source_)
      .asObject(rt)
      .getProperty(rt, imported);
}

jsi::Value ShareableRemoteFunction::toJSValue(jsi::Runtime &rt) {
  if (&rt == runtime_) {
    return jsi::Value(rt, *function_);
  } else {
#ifndef NDEBUG
    return getValueUnpacker(rt).call(
        rt,
        ShareableJSRef::newHostObject(rt, shared_from_this()),
        jsi::String::createFromAscii(rt, "RemoteFunction"),
        jsi::String::createFromUtf8(rt, name_));
#else
    return ShareableJSRef::newHostObject(rt, shared_from_this());
#endif
  }
}

jsi::Value ShareableInitializer::toJSValue(jsi::Runtime &rt) {
  if (remoteValue_ == nullptr) {
    auto initObj = initializer_->toJSValue(rt);
    auto value = std::make_unique<jsi::Value>(getValueUnpacker(rt).call(
        rt, initObj, jsi::String::createFromAscii(rt, "Handle")));

    // We are locking the initialization here since the thread that is
    // initalizing can be pre-empted on runtime lock. E.g.
    // UI thread can be pre-empted on initialization of a shared value and then
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
  return getValueUnpacker(rt).call(
      rt, initObj, jsi::String::createFromAscii(rt, "Handle"));
}

jsi::Value ShareableString::toJSValue(jsi::Runtime &rt) {
  return jsi::String::createFromUtf8(rt, data_);
}

jsi::Value ShareableBigInt::toJSValue(jsi::Runtime &rt) {
  return rt.global()
      .getPropertyAsFunction(rt, "BigInt")
      .call(rt, jsi::String::createFromUtf8(rt, string_));
}

jsi::Value ShareableScalar::toJSValue(jsi::Runtime &) {
  switch (valueType_) {
    case Shareable::UndefinedType:
      return jsi::Value();
    case Shareable::NullType:
      return jsi::Value(nullptr);
    case Shareable::BooleanType:
      return jsi::Value(data_.boolean);
    case Shareable::NumberType:
      return jsi::Value(data_.number);
    default:
      throw std::runtime_error(
          "[Worklets] Attempted to convert object that's not of a scalar type.");
  }
}

jsi::Value ShareableTurboModuleLike::toJSValue(jsi::Runtime &rt) {
  auto obj = properties_->toJSValue(rt).asObject(rt);
  const auto prototype = proto_->toJSValue(rt);
  rt.global()
      .getPropertyAsObject(rt, "Object")
      .getPropertyAsFunction(rt, "setPrototypeOf")
      .call(rt, obj, prototype);

  return obj;
}

} // namespace worklets
