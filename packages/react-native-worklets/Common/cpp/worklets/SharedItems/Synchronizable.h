#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/SynchronizableAccess.h>

#include <memory>
#include <utility>

namespace worklets {

class Synchronizable : public SynchronizableAccess,
                       public Serializable,
                       public jsi::NativeState,
                       public std::enable_shared_from_this<Synchronizable> {
 public:
  /**
   * Can run concurrently with getDirty, setDirty, getBlocking, setBlocking.
   */
  virtual std::shared_ptr<Serializable> getDirty() = 0;

  /**
   * Can run concurrently with getDirty, getBlocking.
   * Can't run concurrently with setDirty, setBlocking.
   */
  virtual std::shared_ptr<Serializable> getBlocking() = 0;

  // TODO: Shared pointer members (unless they're atomic) can't be assigned
  // in a non thread-safe manner, therefore `setDirty` has little sense now.
  /**
   * Can run concurrently with getDirty, getBlocking.
   * Can't run concurrently with setDirty, setBlocking.
   */
  // void setDirty(const std::shared_ptr<Serializable> &value);

  /**
   * Can run concurrently with getDirty.
   * Can't run concurrently with getBlocking, setDirty, setBlocking.
   */
  virtual void setBlocking(const std::shared_ptr<Serializable> &value) = 0;

  jsi::Value toJSValue(jsi::Runtime &rt) final {
    auto synchronizableUnpacker = rt.global().getProperty(rt, "__synchronizableUnpacker");
    react_native_assert(synchronizableUnpacker.isObject() && "synchronizableUnpacker not found");
    auto ref = SerializableJSRef::newNativeStateObject(rt, this->shared_from_this());
    return synchronizableUnpacker.getObject(rt).getFunction(rt).call(rt, std::move(ref));
  }

  ~Synchronizable() override = default;

 protected:
  Synchronizable() : Serializable(ValueType::SynchronizableType) {}
};

inline std::shared_ptr<Synchronizable> extractSynchronizableOrThrow(jsi::Runtime &rt, const jsi::Value &value) {
  auto serializable =
      extractSerializableOrThrow(rt, value, "[Worklets] Expecting the object to be of type SerializableJSRef.");

  auto synchronizable = std::dynamic_pointer_cast<Synchronizable>(serializable);
  react_native_assert(synchronizable != nullptr && "[Worklets] Expected the object to be a Synchronizable.");

  return synchronizable;
}

}; // namespace worklets
