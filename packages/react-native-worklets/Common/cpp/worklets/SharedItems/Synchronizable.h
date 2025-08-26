#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/SharedItems/SynchronizableAccess.h>

#include <memory>

using namespace facebook;

namespace worklets {

class Synchronizable : public SynchronizableAccess,
                       public Serializable,
                       public jsi::NativeState,
                       public std::enable_shared_from_this<Synchronizable> {
 public:
  /**
   * Can run concurrently with getDirty, setDirty, getBlocking, setBlocking.
   */
  std::shared_ptr<Serializable> getDirty();

  /**
   * Can run concurrently with getDirty, getBlocking.
   * Can't run concurrently with setDirty, setBlocking.
   */
  std::shared_ptr<Serializable> getBlocking();

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
  void setBlocking(const std::shared_ptr<Serializable> &value);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

  explicit Synchronizable(const std::shared_ptr<Serializable> &value);

  virtual ~Synchronizable() = default;

 private:
  std::shared_ptr<Serializable> value_;
};

jsi::Function getSynchronizableUnpacker(jsi::Runtime &rt);

std::shared_ptr<Synchronizable> extractSynchronizableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &value);

}; // namespace worklets
