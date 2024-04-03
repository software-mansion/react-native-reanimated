#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/RuntimeExecutor.h>
#include <jsi/jsi.h>

#include <memory>
#include <utility>

using namespace facebook;
using namespace react;

using Job = std::function<void(jsi::Runtime &rt)>;

namespace reanimated {

class JSScheduler {
 public:
  // With `jsCallInvoker`.
  explicit JSScheduler(
      jsi::Runtime &rnRuntime,
      const std::shared_ptr<CallInvoker> &jsCallInvoker);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  // With `runtimeExecutor`.
  explicit JSScheduler(
      jsi::Runtime &rnRuntime,
      RuntimeExecutor runtimeExecutor);
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

 protected:
  jsi::Runtime &rnRuntime_;
  const std::shared_ptr<CallInvoker> jsCallInvoker_ = nullptr;
#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  RuntimeExecutor runtimeExecutor_ = nullptr;
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

 public:
  const std::function<void(Job)> scheduleOnJS = nullptr;
};

} // namespace reanimated
