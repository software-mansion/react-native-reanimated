#pragma once

#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>

#include <memory>

using namespace facebook;
using namespace react;

namespace worklets {

class JSScheduler {
  using Job = std::function<void(jsi::Runtime &rt)>;

 public:
  explicit JSScheduler(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<CallInvoker> &jsCallInvoker)
      : rnRuntime_(rnRuntime), jsCallInvoker_(jsCallInvoker) {}

  void scheduleOnJS(std::function<void(jsi::Runtime &rt)> job);

 protected:
  jsi::Runtime &rnRuntime_;
  const std::shared_ptr<CallInvoker> jsCallInvoker_;
};

} // namespace worklets
