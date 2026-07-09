#pragma once

#include <jsi/jsi.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/Registries/WorkletRuntimeRegistry.h>
#include <worklets/Tools/JSScheduler.h>
#include <worklets/WorkletRuntime/RuntimeData.h>

#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <utility>
#include <vector>

using namespace facebook;

namespace worklets {

// Frees the heap-allocated jsi::Value wrapper without running ~jsi::Value.
// Use when the runtime that owns the JSI handle is already gone. When the
// owning runtime is terminated, the orphaned JSI objects would crash the app
// if their destructors ran, because they call into memory managed by the
// terminated runtime. The JS object itself lived inside the runtime's heap
// and was reclaimed with the runtime; only the C++ wrapper allocation
// remains, and we free it here without invoking ~jsi::Value.
// See https://github.com/facebook/hermes/blob/75b617a/API/jsi/jsi/jsi.h#L833
inline void freeWithoutCallingDestructor(std::unique_ptr<jsi::Value> &value) {
  ::operator delete(value.release());
}

inline void cleanupRuntimeAware(jsi::Runtime *rt, std::unique_ptr<jsi::Value> &value) {
  if (value == nullptr || rt == nullptr) {
    return;
  }
  WorkletRuntimeRegistry::runWhileLocked(rt, [&value](bool isAlive) {
    if (isAlive) {
      value.reset();
    } else {
      freeWithoutCallingDestructor(value);
    }
  });
}

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

  jsi::Value toJSValue(jsi::Runtime &rt) override {
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

  ~RetainingSerializable() override {
    cleanupRuntimeAware(secondaryRuntime_, secondaryValue_);
  }
};

class SerializableJSRef : public jsi::NativeState {
 private:
  const std::shared_ptr<Serializable> value_;

 public:
  explicit SerializableJSRef(const std::shared_ptr<Serializable> &value) : value_(value) {}

  ~SerializableJSRef() override;

  std::shared_ptr<Serializable> value() const {
    return value_;
  }

  static jsi::Object newNativeStateObject(jsi::Runtime &rt, const std::shared_ptr<Serializable> &value) {
    auto object = jsi::Object(rt);
    object.setNativeState(rt, std::make_shared<SerializableJSRef>(value));
    object.setProperty(rt, "__serializableRef", true);
    return object;
  }
};

[[nodiscard]]
jsi::Value makeSerializableClone(
    jsi::Runtime &rt,
    const jsi::Value &value,
    const jsi::Value &shouldRetainRemote,
    const jsi::Value &nativeStateSource);

[[nodiscard]]
std::shared_ptr<Serializable> extractSerializableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &maybeSerializableValue,
    const std::string &errorMessage = "[Worklets] Expecting the object to be of type SerializableJSRef.");

[[nodiscard]]
std::shared_ptr<Serializable> extractSerializableOrThrow(
    jsi::Runtime &rt,
    const jsi::Object &maybeSerializableValue,
    const std::string &errorMessage = "[Worklets] Expecting the object to be of type SerializableJSRef.");

template <typename TSerializable>
[[nodiscard]]
std::shared_ptr<TSerializable> extractSerializableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &serializableRef,
    const std::string &errorMessage = "[Worklets] Provided serializable object is of an incompatible type.") {
  auto res = std::dynamic_pointer_cast<TSerializable>(extractSerializableOrThrow(rt, serializableRef, errorMessage));
  if (!res) {
    throw std::runtime_error(errorMessage);
  }
  return res;
}

template <typename TSerializable>
[[nodiscard]]
std::shared_ptr<TSerializable> extractSerializableOrThrow(
    jsi::Runtime &rt,
    const jsi::Object &serializableRef,
    const std::string &errorMessage = "[Worklets] Provided serializable object is of an incompatible type.") {
  auto res = std::dynamic_pointer_cast<TSerializable>(extractSerializableOrThrow(rt, serializableRef, errorMessage));
  if (!res) {
    throw std::runtime_error(errorMessage);
  }
  return res;
}

class SerializableArray : public Serializable {
 public:
  SerializableArray(jsi::Runtime &rt, const jsi::Array &array);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

  std::vector<jsi::Value> getJSIValueArr(jsi::Runtime &rt) {
    std::vector<jsi::Value> args;
    args.reserve(data_.size());
    for (const auto &item : data_) {
      args.push_back(item->toJSValue(rt));
    }
    return args;
  }

  [[nodiscard]] const std::vector<std::shared_ptr<Serializable>> &getList() const {
    return data_;
  }

 protected:
  std::vector<std::shared_ptr<Serializable>> data_;
};

class SerializableObject : public Serializable {
 public:
  SerializableObject(jsi::Runtime &rt, const jsi::Object &object);

  SerializableObject(jsi::Runtime &rt, const jsi::Object &object, const jsi::Value &nativeStateSource);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  std::vector<std::pair<std::string, std::shared_ptr<Serializable>>> data_;
  std::shared_ptr<jsi::NativeState> nativeState_;
};

class SerializableMap : public Serializable {
 public:
  SerializableMap(jsi::Runtime &rt, const jsi::Array &keys, const jsi::Array &values);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  std::vector<std::pair<std::shared_ptr<Serializable>, std::shared_ptr<Serializable>>> data_;
};

class SerializableSet : public Serializable {
 public:
  SerializableSet(jsi::Runtime &rt, const jsi::Array &values);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  std::vector<std::shared_ptr<Serializable>> data_;
};

class SerializableError : public Serializable {
 public:
  SerializableError(const std::string &name, const std::string &message, const std::optional<std::string> &stack)
      : Serializable(ValueType::ErrorType), name_(name), message_(message), stack_(stack) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const std::string name_;
  const std::string message_;
  const std::optional<std::string> stack_;
};

class SerializableRegExp : public Serializable {
 public:
  SerializableRegExp(const std::string &pattern, const std::string &flags)
      : Serializable(ValueType::RegExpType), pattern_(pattern), flags_(flags) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const std::string pattern_;
  const std::string flags_;
};

class SerializableHostObject : public Serializable {
 public:
  SerializableHostObject(jsi::Runtime &, const std::shared_ptr<jsi::HostObject> &hostObject)
      : Serializable(ValueType::HostObjectType), hostObject_(hostObject) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const std::shared_ptr<jsi::HostObject> hostObject_;
};

class SerializableHostFunction : public Serializable {
 public:
  SerializableHostFunction(const jsi::HostFunctionType &function, const std::string &name, unsigned int paramCount)
      : Serializable(ValueType::HostFunctionType), hostFunction_(function), name_(name), paramCount_(paramCount) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const jsi::HostFunctionType hostFunction_;
  const std::string name_;
  const unsigned int paramCount_;
};

struct ArrayBufferMetadata {
  std::string typeName;
  size_t byteOffset;
  size_t length;
};

class SerializableArrayBuffer : public Serializable {
 public:
  SerializableArrayBuffer(
      jsi::Runtime &rt,
      const jsi::ArrayBuffer &arrayBuffer,
      std::optional<ArrayBufferMetadata> metadata = std::nullopt)
      : Serializable(ValueType::ArrayBufferType),
        metadata_(std::move(metadata)),
        data_(arrayBuffer.data(rt), arrayBuffer.data(rt) + arrayBuffer.size(rt)) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  std::optional<ArrayBufferMetadata> metadata_;
  std::vector<uint8_t> data_;
};

class SerializableWorklet : public SerializableObject {
 public:
  SerializableWorklet(jsi::Runtime &rt, const jsi::Object &worklet) : SerializableObject(rt, worklet) {
    valueType_ = ValueType::WorkletType;
  }

  jsi::Value toJSValue(jsi::Runtime &rt) override;
};

class SerializableImport : public Serializable {
 public:
  SerializableImport(jsi::Runtime &rt, const double source, const jsi::String &imported)
      : Serializable(ValueType::ImportType), source_(source), imported_(imported.utf8(rt)) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const double source_;
  const std::string imported_;
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
  SerializableInitializer(jsi::Runtime &rt, const jsi::Object &initializerObject)
      : Serializable(ValueType::HandleType),
        initializer_(std::make_unique<SerializableObject>(rt, initializerObject)) {}

  ~SerializableInitializer() override {
    cleanupRuntimeAware(remoteRuntime_, remoteValue_);
  }

  jsi::Value toJSValue(jsi::Runtime &rt) override;
};

class SerializableString : public Serializable {
 public:
  explicit SerializableString(const std::string &string) : Serializable(ValueType::StringType), data_(string) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  const std::string data_;
};

class SerializableBigInt : public Serializable {
 public:
  explicit SerializableBigInt(jsi::Runtime &rt, const jsi::BigInt &bigInt) : Serializable(ValueType::BigIntType) {
    if (bigInt.isInt64(rt)) {
      fastValue_ = bigInt.getInt64(rt);
    } else {
      slowValue_ = bigInt.toString(rt).utf8(rt);
    }
  }

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 protected:
  /**
   * This member is used only when the BigInt fits into int64_t range.
   */
  std::optional<int64_t> fastValue_{};
  std::string slowValue_{};
};

class SerializableScalar : public Serializable {
 public:
  explicit SerializableScalar(double number) : Serializable(ValueType::NumberType) {
    data_.number = number;
  }
  explicit SerializableScalar(bool boolean) : Serializable(ValueType::BooleanType) {
    data_.boolean = boolean;
  }
  SerializableScalar() : Serializable(ValueType::UndefinedType) {}
  explicit SerializableScalar(std::nullptr_t) : Serializable(ValueType::NullType) {}

  jsi::Value toJSValue(jsi::Runtime &) override;

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
      : Serializable(ValueType::TurboModuleLikeType),
        proto_(std::make_unique<SerializableHostObject>(rt, proto)),
        properties_(std::make_unique<SerializableObject>(rt, object)) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 private:
  const std::unique_ptr<SerializableHostObject> proto_;
  const std::unique_ptr<SerializableObject> properties_;
};

jsi::Function getCustomSerializableUnpacker(jsi::Runtime &rt);

class CustomSerializable : public Serializable {
 public:
  CustomSerializable(std::shared_ptr<Serializable> data, const int typeId)
      : Serializable(ValueType::CustomType), data_(std::move(data)), typeId_(typeId) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 private:
  const std::shared_ptr<Serializable> data_;
  const int typeId_;
};

struct SerializationData {
  std::shared_ptr<SerializableWorklet> determine;
  std::shared_ptr<SerializableWorklet> pack;
  std::shared_ptr<SerializableWorklet> unpack;
  int typeId;
};

} // namespace worklets
