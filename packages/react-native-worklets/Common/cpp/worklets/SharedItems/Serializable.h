#pragma once

#include <worklets/Registries/WorkletRuntimeRegistry.h>

#include <jsi/jsi.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

using namespace facebook;

namespace worklets {

jsi::Function getValueUnpacker(jsi::Runtime &rt);

#ifndef NDEBUG
jsi::Function getCallGuard(jsi::Runtime &rt);
#endif // NDEBUG

// If possible, please use `WorkletRuntime::runGuarded` instead.
template <typename... Args>
inline jsi::Value runOnRuntimeGuarded(
    jsi::Runtime &rt,
    const jsi::Value &function,
    Args &&...args) {
  // We only use callGuard in debug mode, otherwise we call the provided
  // function directly. CallGuard provides a way of capturing exceptions in
  // JavaScript and propagating them to the main React Native thread such that
  // they can be presented using RN's LogBox.
#ifndef NDEBUG
  return getCallGuard(rt).call(rt, function, args...);
#else
  return function.asObject(rt).asFunction(rt).call(rt, args...);
#endif // NDEBUG
}

inline void cleanupIfRuntimeExists(
    jsi::Runtime *rt,
    std::unique_ptr<jsi::Value> &value) {
  if (rt != nullptr && !WorkletRuntimeRegistry::isRuntimeAlive(rt)) {
    // The below use of unique_ptr.release prevents the smart pointer from
    // calling the destructor of the kept object. This effectively results in
    // leaking some memory. We do this on purpose, as sometimes we would keep
    // references to JSI objects past the lifetime of its runtime (e.g.,
    // shared values references from the RN VM holds reference to JSI objects
    // on the UI runtime). When the UI runtime is terminated, the orphaned JSI
    // objects would crash the app when their destructors are called, because
    // they call into a memory that's managed by the terminated runtime. We
    // accept the tradeoff of leaking memory here, as it has a limited impact.
    // This scenario can only occur when the React instance is torn down which
    // happens in development mode during app reloads, or in production when
    // the app is being shut down gracefully by the system. An alternative
    // solution would require us to keep track of all JSI values that are in
    // use which would require additional data structure and compute spent on
    // bookkeeping that only for the sake of destroying the values in time
    // before the runtime is terminated. Note that the underlying memory that
    // jsi::Value refers to is managed by the VM and gets freed along with the
    // runtime.
    value.release();
  }
}

class Serializable {
 public:
  virtual jsi::Value toJSValue(jsi::Runtime &rt) = 0;

  virtual ~Serializable();

  enum ValueType {
    UndefinedType,
    NullType,
    BooleanType,
    NumberType,
    // SymbolType, TODO
    BigIntType,
    StringType,
    ObjectType,
    ArrayType,
    MapType,
    SetType,
    WorkletType,
    RemoteFunctionType,
    HandleType,
    HostObjectType,
    HostFunctionType,
    ArrayBufferType,
    TurboModuleLikeType,
    ImportType,
    SynchronizableType,
  };

  explicit Serializable(ValueType valueType) : valueType_(valueType) {}

  inline ValueType valueType() const {
    return valueType_;
  }

  static std::shared_ptr<Serializable> undefined();

 protected:
  ValueType valueType_;
};

template <typename BaseClass>
class RetainingSerializable : virtual public BaseClass {
 private:
  jsi::Runtime *primaryRuntime_;
  jsi::Runtime *secondaryRuntime_;
  std::unique_ptr<jsi::Value> secondaryValue_;

 public:
  template <typename... Args>
  explicit RetainingSerializable(jsi::Runtime &rt, Args &&...args)
      : BaseClass(rt, std::forward<Args>(args)...), primaryRuntime_(&rt) {}

  jsi::Value toJSValue(jsi::Runtime &rt);

  ~RetainingSerializable() {
    cleanupIfRuntimeExists(secondaryRuntime_, secondaryValue_);
  }
};

class SerializableJSRef : public jsi::NativeState {
 private:
  const std::shared_ptr<Serializable> value_;

 public:
  explicit SerializableJSRef(const std::shared_ptr<Serializable> &value)
      : value_(value) {}

  virtual ~SerializableJSRef();

  std::shared_ptr<Serializable> value() const {
    return value_;
  }

  static jsi::Object newNativeStateObject(
      jsi::Runtime &rt,
      const std::shared_ptr<Serializable> &value) {
    auto object = jsi::Object(rt);
    object.setNativeState(rt, std::make_shared<SerializableJSRef>(value));
    object.setProperty(rt, "__serializableRef", true);
    return object;
  }
};

jsi::Value makeSerializableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote,
    const jsi::Value &nativeStateSource);

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

jsi::Value makeSerializableImport(
    jsi::Runtime &rt,
    const double source,
    const jsi::String &imported);

jsi::Value makeSerializableHostObject(
    jsi::Runtime &rt,
    const std::shared_ptr<jsi::HostObject> &value);

jsi::Value makeSerializableArray(
    jsi::Runtime &rt,
    const jsi::Array &array,
    const jsi::Value &shouldRetainRemote);

jsi::Value makeSerializableMap(
    jsi::Runtime &rt,
    const jsi::Array &keys,
    const jsi::Array &values);

jsi::Value makeSerializableSet(jsi::Runtime &rt, const jsi::Array &values);

jsi::Value makeSerializableInitializer(
    jsi::Runtime &rt,
    const jsi::Object &initializerObject);

jsi::Value makeSerializableFunction(jsi::Runtime &rt, jsi::Function function);

jsi::Value makeSerializableWorklet(
    jsi::Runtime &rt,
    const jsi::Object &object,
    const bool &shouldRetainRemote);

std::shared_ptr<Serializable> extractSerializableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &maybeSerializableValue,
    const std::string &errorMessage =
        "[Worklets] Expecting the object to be of type SerializableJSRef.");

template <typename T>
std::shared_ptr<T> extractSerializableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &serializableRef,
    const std::string &errorMessage =
        "[Worklets] Provided serializable object is of an incompatible type.") {
  auto res = std::dynamic_pointer_cast<T>(
      extractSerializableOrThrow(rt, serializableRef, errorMessage));
  if (!res) {
    throw std::runtime_error(errorMessage);
  }
  return res;
}

class SerializableArray : public Serializable {
 public:
  SerializableArray(jsi::Runtime &rt, const jsi::Array &array);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  std::vector<std::shared_ptr<Serializable>> data_;
};

class SerializableObject : public Serializable {
 public:
  SerializableObject(jsi::Runtime &rt, const jsi::Object &object);

  SerializableObject(
      jsi::Runtime &rt,
      const jsi::Object &object,
      const jsi::Value &nativeStateSource);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  std::vector<std::pair<std::string, std::shared_ptr<Serializable>>> data_;
  std::shared_ptr<jsi::NativeState> nativeState_;
};

class SerializableMap : public Serializable {
 public:
  SerializableMap(
      jsi::Runtime &rt,
      const jsi::Array &keys,
      const jsi::Array &values);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  std::vector<
      std::pair<std::shared_ptr<Serializable>, std::shared_ptr<Serializable>>>
      data_;
};

class SerializableSet : public Serializable {
 public:
  SerializableSet(jsi::Runtime &rt, const jsi::Array &values);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  std::vector<std::shared_ptr<Serializable>> data_;
};

class SerializableHostObject : public Serializable {
 public:
  SerializableHostObject(
      jsi::Runtime &,
      const std::shared_ptr<jsi::HostObject> &hostObject)
      : Serializable(HostObjectType), hostObject_(hostObject) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const std::shared_ptr<jsi::HostObject> hostObject_;
};

class SerializableHostFunction : public Serializable {
 public:
  SerializableHostFunction(jsi::Runtime &rt, jsi::Function function)
      : Serializable(HostFunctionType),
        hostFunction_(function.getHostFunction(rt)),
        name_(function.getProperty(rt, "name").asString(rt).utf8(rt)),
        paramCount_(function.getProperty(rt, "length").asNumber()) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const jsi::HostFunctionType hostFunction_;
  const std::string name_;
  const unsigned int paramCount_;
};

class SerializableArrayBuffer : public Serializable {
 public:
  SerializableArrayBuffer(jsi::Runtime &rt, const jsi::ArrayBuffer &arrayBuffer)
      : Serializable(ArrayBufferType),
        data_(
            arrayBuffer.data(rt),
            arrayBuffer.data(rt) + arrayBuffer.size(rt)) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const std::vector<uint8_t> data_;
};

class SerializableWorklet : public SerializableObject {
 public:
  SerializableWorklet(jsi::Runtime &rt, const jsi::Object &worklet)
      : SerializableObject(rt, worklet) {
    valueType_ = WorkletType;
  }

  jsi::Value toJSValue(jsi::Runtime &rt) override;
};

class SerializableImport : public Serializable {
 public:
  SerializableImport(
      jsi::Runtime &rt,
      const double source,
      const jsi::String &imported)
      : Serializable(ImportType),
        source_(source),
        imported_(imported.utf8(rt)) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const double source_;
  const std::string imported_;
};

class SerializableRemoteFunction
    : public Serializable,
      public std::enable_shared_from_this<SerializableRemoteFunction> {
 private:
  jsi::Runtime *runtime_;
#ifndef NDEBUG
  const std::string name_;
#endif
  std::unique_ptr<jsi::Value> function_;

 public:
  SerializableRemoteFunction(jsi::Runtime &rt, jsi::Function &&function)
      : Serializable(RemoteFunctionType),
        runtime_(&rt),
#ifndef NDEBUG
        name_(function.getProperty(rt, "name").asString(rt).utf8(rt)),
#endif
        function_(std::make_unique<jsi::Value>(rt, std::move(function))) {
  }

  ~SerializableRemoteFunction() {
    cleanupIfRuntimeExists(runtime_, function_);
  }

  jsi::Value toJSValue(jsi::Runtime &rt) override;
};

class SerializableInitializer : public Serializable {
 private:
  // We don't release the initializer since the handle can get
  // initialized in parallel on multiple threads. However this is not a problem,
  // since the final value is taken from a cache on the runtime which guarantees
  // sequential access.
  std::unique_ptr<SerializableObject> initializer_;
  std::unique_ptr<jsi::Value> remoteValue_;
  mutable std::mutex initializationMutex_;
  jsi::Runtime *remoteRuntime_;

 public:
  SerializableInitializer(
      jsi::Runtime &rt,
      const jsi::Object &initializerObject)
      : Serializable(HandleType),
        initializer_(
            std::make_unique<SerializableObject>(rt, initializerObject)) {}

  ~SerializableInitializer() {
    cleanupIfRuntimeExists(remoteRuntime_, remoteValue_);
  }

  jsi::Value toJSValue(jsi::Runtime &rt) override;
};

class SerializableString : public Serializable {
 public:
  explicit SerializableString(const std::string &string)
      : Serializable(StringType), data_(string) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const std::string data_;
};

class SerializableBigInt : public Serializable {
 public:
  explicit SerializableBigInt(jsi::Runtime &rt, const jsi::BigInt &bigint)
      : Serializable(BigIntType), string_(bigint.toString(rt).utf8(rt)) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const std::string string_;
};

class SerializableScalar : public Serializable {
 public:
  explicit SerializableScalar(double number) : Serializable(NumberType) {
    data_.number = number;
  }
  explicit SerializableScalar(bool boolean) : Serializable(BooleanType) {
    data_.boolean = boolean;
  }
  SerializableScalar() : Serializable(UndefinedType) {}
  explicit SerializableScalar(std::nullptr_t) : Serializable(NullType) {}

  jsi::Value toJSValue(jsi::Runtime &);

 protected:
  union Data {
    bool boolean;
    double number;
  };

 private:
  Data data_;
};

class SerializableTurboModuleLike : public Serializable {
 public:
  SerializableTurboModuleLike(
      jsi::Runtime &rt,
      const jsi::Object &object,
      const std::shared_ptr<jsi::HostObject> &proto)
      : Serializable(TurboModuleLikeType),
        proto_(std::make_unique<SerializableHostObject>(rt, proto)),
        properties_(std::make_unique<SerializableObject>(rt, object)) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 private:
  const std::unique_ptr<SerializableHostObject> proto_;
  const std::unique_ptr<SerializableObject> properties_;
};

} // namespace worklets
