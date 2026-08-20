#pragma once

#include <jsi/jsi.h>
#include <worklets/Compat/StableApi.h>
#include <worklets/Registries/WorkletRuntimeRegistry.h>

#include <memory>
#include <new>
#include <stdexcept>
#include <string>

namespace worklets {

// Frees the heap-allocated facebook::jsi::Value wrapper without running ~facebook::jsi::Value.
// Use when the runtime that owns the JSI handle is already gone. When the
// owning runtime is terminated, the orphaned JSI objects would crash the app
// if their destructors ran, because they call into memory managed by the
// terminated runtime. The JS object itself lived inside the runtime's heap
// and was reclaimed with the runtime; only the C++ wrapper allocation
// remains, and we free it here without invoking ~facebook::jsi::Value.
// See https://github.com/facebook/hermes/blob/75b617a/API/jsi/jsi/jsi.h#L833
inline void freeWithoutCallingDestructor(std::unique_ptr<facebook::jsi::Value> &value) {
  ::operator delete(value.release());
}

inline void cleanupRuntimeAware(facebook::jsi::Runtime *rt, std::unique_ptr<facebook::jsi::Value> &value) {
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

inline void cleanupRuntimeAware(facebook::jsi::Runtime *rt, facebook::jsi::Value &value) {
  if (rt == nullptr || value.isUndefined()) {
    return;
  }
  WorkletRuntimeRegistry::runWhileLocked(rt, [&value](bool isAlive) {
    if (isAlive) {
      value.~Value();
    }
    new (&value) facebook::jsi::Value(facebook::jsi::Value::undefined());
  });
}

class SerializableJSRef : public facebook::jsi::NativeState {
 private:
  const std::shared_ptr<Serializable> value_;

 public:
  explicit SerializableJSRef(const std::shared_ptr<Serializable> &value) : value_(value) {}

  ~SerializableJSRef() override;

  std::shared_ptr<Serializable> value() const {
    return value_;
  }

  static facebook::jsi::Object newNativeStateObject(
      facebook::jsi::Runtime &rt,
      const std::shared_ptr<Serializable> &value) {
    auto object = facebook::jsi::Object(rt);
    object.setNativeState(rt, std::make_shared<SerializableJSRef>(value));
    object.setProperty(rt, "__serializableRef", true);
    return object;
  }
};

facebook::jsi::Function getValueUnpacker(facebook::jsi::Runtime &rt);

[[nodiscard]]
facebook::jsi::Value makeSerializableClone(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &value,
    const facebook::jsi::Value &shouldRetainRemote,
    const facebook::jsi::Value &nativeStateSource);

[[nodiscard]]
std::shared_ptr<Serializable> extractSerializableOrThrow(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &maybeSerializableValue,
    const std::string &errorMessage = "[Worklets] Expecting the object to be of type SerializableJSRef.");

[[nodiscard]]
std::shared_ptr<Serializable> extractSerializableOrThrow(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &maybeSerializableValue,
    const std::string &errorMessage = "[Worklets] Expecting the object to be of type SerializableJSRef.");

template <typename TSerializable>
[[nodiscard]]
std::shared_ptr<TSerializable> extractSerializableOrThrow(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &serializableRef,
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
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &serializableRef,
    const std::string &errorMessage = "[Worklets] Provided serializable object is of an incompatible type.") {
  auto res = std::dynamic_pointer_cast<TSerializable>(extractSerializableOrThrow(rt, serializableRef, errorMessage));
  if (!res) {
    throw std::runtime_error(errorMessage);
  }
  return res;
}

} // namespace worklets
