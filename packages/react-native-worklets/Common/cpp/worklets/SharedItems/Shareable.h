#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>

namespace worklets {

class Shareable : public Serializable, public std::enable_shared_from_this<Shareable> {
 public:
  static jsi::Function getShareableUnpacker(jsi::Runtime &rt);

  Shareable(
      const std::shared_ptr<Serializable> &initial,
      const std::weak_ptr<WorkletRuntime> &hostRuntime,
      bool isInline);

  jsi::Value toJSValue(jsi::Runtime &rt) override;

 private:
  std::shared_ptr<jsi::Value> value_;
  std::weak_ptr<WorkletRuntime> hostRuntime_;
  bool isInline_;
};

} // namespace worklets
