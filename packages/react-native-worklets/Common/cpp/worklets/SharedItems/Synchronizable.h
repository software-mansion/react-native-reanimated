#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/SynchronizableAccess.h>

#include <memory>
#include <utility>
#include <variant>

namespace worklets {

using SynchronizableValue = std::variant<std::shared_ptr<Serializable>, double, bool>;
using SynchronizableFixedValue = std::variant<double, bool>;

class Synchronizable : public SynchronizableAccess,
                       public Serializable,
                       public facebook::jsi::NativeState,
                       public std::enable_shared_from_this<Synchronizable> {
 public:
  static std::shared_ptr<Synchronizable> extractSynchronizableOrThrow(
      facebook::jsi::Runtime &rt,
      const facebook::jsi::Value &value) {
    auto serializable =
        extractSerializableOrThrow(rt, value, "[Worklets] Expecting the object to be of type SerializableJSRef.");

    auto synchronizable = std::dynamic_pointer_cast<Synchronizable>(serializable);
    react_native_assert(synchronizable != nullptr && "[Worklets] Expected the object to be a Synchronizable.");

    return synchronizable;
  }

  /**
   * Can run concurrently with getDirty, setDirty, getBlocking, setBlocking.
   */
  virtual SynchronizableValue getDirty() = 0;

  /**
   * Can run concurrently with getDirty, getBlocking.
   * Can't run concurrently with setDirty, setBlocking.
   */
  virtual SynchronizableValue getBlocking() = 0;

  /**
   * Can run concurrently with getDirty.
   * Can't run concurrently with getBlocking, setDirty, setBlocking.
   */
  virtual void setBlocking(const std::shared_ptr<Serializable> &value) = 0;

  virtual void setBlocking(const SynchronizableFixedValue &value) = 0;

  facebook::jsi::Value toJSValue(facebook::jsi::Runtime &rt) final {
    auto synchronizableUnpacker = rt.global().getProperty(rt, "__synchronizableUnpacker");
    react_native_assert(synchronizableUnpacker.isObject() && "synchronizableUnpacker not found");
    auto ref = SerializableJSRef::newNativeStateObject(rt, this->shared_from_this());
    return synchronizableUnpacker.getObject(rt).getFunction(rt).call(rt, std::move(ref));
  }

  ~Synchronizable() override = default;

 protected:
  Synchronizable() : Serializable(ValueType::SynchronizableType) {}
};

} // namespace worklets
