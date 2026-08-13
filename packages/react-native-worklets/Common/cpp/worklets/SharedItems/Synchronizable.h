#pragma once

#include <jsi/jsi.h>
#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/SynchronizableAccess.h>

#include <memory>

namespace worklets {

class Synchronizable : public SynchronizableAccess,
                       public Serializable,
                       public jsi::NativeState,
                       public std::enable_shared_from_this<Synchronizable> {
 public:
  bool isFixed() const {
    return isFixed_;
  }

  virtual jsi::Value getDirty(jsi::Runtime &rt) = 0;

  virtual jsi::Value getBlocking(jsi::Runtime &rt) = 0;

  virtual void setDirty(jsi::Runtime &rt, const jsi::Value &value) = 0;

  virtual void setBlocking(jsi::Runtime &rt, const jsi::Value &value) = 0;

  jsi::Value toJSValue(jsi::Runtime &rt) final;

  ~Synchronizable() override = default;

 protected:
  explicit Synchronizable(bool isFixed);

 private:
  const bool isFixed_;
};

inline std::shared_ptr<Synchronizable> extractSynchronizableOrThrow(jsi::Runtime &rt, const jsi::Value &value) {
  auto serializable =
      extractSerializableOrThrow(rt, value, "[Worklets] Expecting the object to be of type SerializableJSRef.");

  auto synchronizable = std::dynamic_pointer_cast<Synchronizable>(serializable);
  react_native_assert(synchronizable != nullptr && "[Worklets] Expected the object to be a Synchronizable.");

  return synchronizable;
}

}; // namespace worklets
