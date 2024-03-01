#pragma once

#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>

#include <memory>

using namespace facebook;

namespace reanimated {

class JSScheduler {
 public:
  explicit JSScheduler(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker,
      std::function<void(std::function<void(jsi::Runtime &runtime)> &&callback)>
          runtimeExecutor)
      : rnRuntime_(rnRuntime),
        jsCallInvoker_(jsCallInvoker),
        runtimeExecutor_(runtimeExecutor) {}
  void scheduleOnJS(std::function<void(jsi::Runtime &rt)> job);

 protected:
  jsi::Runtime &rnRuntime_;
  const std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker_;
  std::function<void(std::function<void(jsi::Runtime &runtime)> &&callback)>
      runtimeExecutor_;
};

} // namespace reanimated
