#pragma once

#include <worklets/Registries/WorkletRuntimeRegistry.h>

#include <jsi/jsi.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

facebook::jsi::Function getValueUnpacker(facebook::jsi::Runtime &rt);

#ifndef NDEBUG
facebook::jsi::Function getCallGuard(facebook::jsi::Runtime &rt);
#endif // NDEBUG

// If possible, please use `WorkletRuntime::runGuarded` instead.
template <typename... Args>
inline facebook::jsi::Value runOnRuntimeGuarded(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &function,
    Args &&...args) {
  // We only use callGuard in debug mode, otherwise we call the provided
  // function directly. CallGuard provides a way of capturing exceptions in
  // JavaScript and propagating them to the main React Native thread such that
  // they can be presented using RN's LogBox.
#ifndef NDEBUG
  return getCallGuard(rt).call(rt, function, args...);
#else
  return function.asObject(rt).asFunction(rt).call(rt, args...);
#endif
}

inline void cleanupIfRuntimeExists(
    facebook::jsi::Runtime *rt,
    std::unique_ptr<facebook::jsi::Value> &value) {
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
    // facebook::jsi::Value refers to is managed by the VM and gets freed along
    // with the runtime.
    value.release();
  }
}

class Shareable {
 public:
  virtual facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) = 0;

  virtual ~Shareable();

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
    WorkletType,
    RemoteFunctionType,
    HandleType,
    HostObjectType,
    HostFunctionType,
    ArrayBufferType,
  };

  explicit Shareable(ValueType valueType) : valueType_(valueType) {}

  inline ValueType valueType() const {
    return valueType_;
  }

  static std::shared_ptr<Shareable> undefined();

 protected:
  ValueType valueType_;
};

template <typename BaseClass>
class RetainingShareable : virtual public BaseClass {
 private:
  facebook::jsi::Runtime *primaryRuntime_;
  facebook::jsi::Runtime *secondaryRuntime_;
  std::unique_ptr<facebook::jsi::Value> secondaryValue_;

 public:
  template <typename... Args>
  explicit RetainingShareable(facebook::jsi::Runtime &rt, Args &&...args)
      : BaseClass(rt, std::forward<Args>(args)...), primaryRuntime_(&rt) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt);

  ~RetainingShareable() {
    cleanupIfRuntimeExists(secondaryRuntime_, secondaryValue_);
  }
};

class ShareableJSRef : public facebook::jsi::HostObject {
 private:
  const std::shared_ptr<Shareable> value_;

 public:
  explicit ShareableJSRef(const std::shared_ptr<Shareable> &value)
      : value_(value) {}

  virtual ~ShareableJSRef();

  std::shared_ptr<Shareable> value() const {
    return value_;
  }

  static facebook::jsi::Object newHostObject(
      facebook::jsi::Runtime &rt,
      const std::shared_ptr<Shareable> &value) {
    return facebook::jsi::Object::createFromHostObject(
        rt, std::make_shared<ShareableJSRef>(value));
  }
};

facebook::jsi::Value makeShareableClone(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &value,
    const facebook::jsi::Value &shouldRetainRemote,
    const facebook::jsi::Value &nativeStateSource);

std::shared_ptr<Shareable> extractShareableOrThrow(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &maybeShareableValue,
    const std::string &errorMessage =
        "[Reanimated] Expecting the object to be of type ShareableJSRef.");

template <typename T>
std::shared_ptr<T> extractShareableOrThrow(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &shareableRef,
    const std::string &errorMessage =
        "[Reanimated] Provided shareable object is of an incompatible type.") {
  auto res = std::dynamic_pointer_cast<T>(
      extractShareableOrThrow(rt, shareableRef, errorMessage));
  if (!res) {
    throw std::runtime_error(errorMessage);
  }
  return res;
}

class ShareableArray : public Shareable {
 public:
  ShareableArray(facebook::jsi::Runtime &rt, const facebook::jsi::Array &array);

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  std::vector<std::shared_ptr<Shareable>> data_;
};

class ShareableObject : public Shareable {
 public:
  ShareableObject(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Object &object);

#if defined(USE_HERMES) || REACT_NATIVE_MINOR_VERSION >= 74
#define SUPPORTS_NATIVE_STATE 1
#else
#define SUPPORTS_NATIVE_STATE 0
#endif

#if SUPPORTS_NATIVE_STATE
  ShareableObject(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Object &object,
      const facebook::jsi::Value &nativeStateSource);
#endif // SUPPORTS_NATIVE_STATE

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  std::vector<std::pair<std::string, std::shared_ptr<Shareable>>> data_;
#if SUPPORTS_NATIVE_STATE
  std::shared_ptr<facebook::jsi::NativeState> nativeState_;
#endif // SUPPORTS_NATIVE_STATE
};

class ShareableHostObject : public Shareable {
 public:
  ShareableHostObject(
      facebook::jsi::Runtime &,
      const std::shared_ptr<facebook::jsi::HostObject> &hostObject)
      : Shareable(HostObjectType), hostObject_(hostObject) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const std::shared_ptr<facebook::jsi::HostObject> hostObject_;
};

class ShareableHostFunction : public Shareable {
 public:
  ShareableHostFunction(
      facebook::jsi::Runtime &rt,
      facebook::jsi::Function function)
      : Shareable(HostFunctionType),
        hostFunction_(
            (assert(function.isHostFunction(rt)),
             function.getHostFunction(rt))),
        name_(function.getProperty(rt, "name").asString(rt).utf8(rt)),
        paramCount_(function.getProperty(rt, "length").asNumber()) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const facebook::jsi::HostFunctionType hostFunction_;
  const std::string name_;
  const unsigned int paramCount_;
};

class ShareableArrayBuffer : public Shareable {
 public:
  ShareableArrayBuffer(
      facebook::jsi::Runtime &rt,
#if REACT_NATIVE_MINOR_VERSION >= 72
      const facebook::jsi::ArrayBuffer &arrayBuffer
#else
      facebook::jsi::ArrayBuffer arrayBuffer
#endif
      )
      : Shareable(ArrayBufferType),
        data_(
            arrayBuffer.data(rt),
            arrayBuffer.data(rt) + arrayBuffer.size(rt)) {
  }

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const std::vector<uint8_t> data_;
};

class ShareableWorklet : public ShareableObject {
 public:
  ShareableWorklet(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Object &worklet)
      : ShareableObject(rt, worklet) {
    valueType_ = WorkletType;
  }

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;
};

class ShareableRemoteFunction
    : public Shareable,
      public std::enable_shared_from_this<ShareableRemoteFunction> {
 private:
  facebook::jsi::Runtime *runtime_;
#ifndef NDEBUG
  const std::string name_;
#endif
  std::unique_ptr<facebook::jsi::Value> function_;

 public:
  ShareableRemoteFunction(
      facebook::jsi::Runtime &rt,
      facebook::jsi::Function &&function)
      : Shareable(RemoteFunctionType),
        runtime_(&rt),
#ifndef NDEBUG
        name_(function.getProperty(rt, "name").asString(rt).utf8(rt)),
#endif
        function_(
            std::make_unique<facebook::jsi::Value>(rt, std::move(function))) {
  }

  ~ShareableRemoteFunction() {
    cleanupIfRuntimeExists(runtime_, function_);
  }

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;
};

class ShareableHandle : public Shareable {
 private:
  // We don't release the initializer since the handle can get
  // initialized in parallel on multiple threads. However this is not a problem,
  // since the final value is taken from a cache on the runtime which guarantees
  // sequential access.
  std::unique_ptr<ShareableObject> initializer_;
  std::unique_ptr<facebook::jsi::Value> remoteValue_;
  mutable std::mutex initializationMutex_;
  facebook::jsi::Runtime *remoteRuntime_;

 public:
  ShareableHandle(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Object &initializerObject)
      : Shareable(HandleType),
        initializer_(std::make_unique<ShareableObject>(rt, initializerObject)) {
  }

  ~ShareableHandle() {
    cleanupIfRuntimeExists(remoteRuntime_, remoteValue_);
  }

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;
};

class ShareableString : public Shareable {
 public:
  explicit ShareableString(const std::string &string)
      : Shareable(StringType), data_(string) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const std::string data_;
};

class ShareableBigInt : public Shareable {
 public:
  explicit ShareableBigInt(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::BigInt &bigint)
      : Shareable(BigIntType), string_(bigint.toString(rt).utf8(rt)) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) override;

 protected:
  const std::string string_;
};

class ShareableScalar : public Shareable {
 public:
  explicit ShareableScalar(double number) : Shareable(NumberType) {
    data_.number = number;
  }
  explicit ShareableScalar(bool boolean) : Shareable(BooleanType) {
    data_.boolean = boolean;
  }
  ShareableScalar() : Shareable(UndefinedType) {}
  explicit ShareableScalar(std::nullptr_t) : Shareable(NullType) {}

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &);

 protected:
  union Data {
    bool boolean;
    double number;
  };

 private:
  Data data_;
};

} // namespace worklets
