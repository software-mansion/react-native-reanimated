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
      const std::weak_ptr<WorkletRuntime> &hostRuntime,
      const std::shared_ptr<Serializable> &initial,
      const std::shared_ptr<Serializable> &decorateHost = nullptr,
      const std::shared_ptr<Serializable> &decorateGuest = nullptr);

  ~Shareable() override;

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 private:
  std::weak_ptr<WorkletRuntime> hostRuntime_;
  std::shared_ptr<Serializable> initial_;
  std::unique_ptr<jsi::Value> hostValue_;
  std::shared_ptr<Serializable> decorateHost_;
  std::shared_ptr<Serializable> decorateGuest_;
};

} // namespace worklets
