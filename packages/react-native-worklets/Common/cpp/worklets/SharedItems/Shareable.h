#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

namespace worklets {

class Shareable : public Serializable, public std::enable_shared_from_this<Shareable> {
 public:
  static jsi::Function getShareableHostUnpacker(jsi::Runtime &rt);
  static jsi::Function getShareableGuestUnpacker(jsi::Runtime &rt);

  Shareable(
      const std::shared_ptr<WorkletRuntime> &hostRuntime,
      const std::shared_ptr<Serializable> &initial_,
      const bool initSynchronously,
      const std::shared_ptr<Serializable> &decorateHost,
      const std::shared_ptr<Serializable> &decorateGuest);

  ~Shareable() override;

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 private:
  jsi::Value hostJSValue();
  jsi::Value guestJSValue(jsi::Runtime &rt);
  void initHostValue();

  const std::weak_ptr<WorkletRuntime> hostRuntime_;
  const RuntimeData::Id hostRuntimeId_;
  jsi::Runtime &hostJSIRuntime_;
  std::shared_ptr<Serializable> initial_;
  const bool initSynchronously_;
  std::mutex initializationMutex_;
  std::unique_ptr<jsi::Value> hostValue_;
  std::shared_ptr<Serializable> decorateHost_;
  const std::shared_ptr<Serializable> decorateGuest_;
};

} // namespace worklets
