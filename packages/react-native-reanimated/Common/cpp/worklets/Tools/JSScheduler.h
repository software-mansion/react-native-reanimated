#pragma once

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/RuntimeExecutor.h>
#include <jsi/jsi.h>

#include <memory>

namespace worklets {

class JSScheduler {
  using Job = std::function<void(facebook::jsi::Runtime &rt)>;

 public:
  // With `jsCallInvoker`.
  explicit JSScheduler(
      facebook::jsi::Runtime &rnRuntime,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker);

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  // With `runtimeExecutor`.
  explicit JSScheduler(
      facebook::jsi::Runtime &rnRuntime,
      facebook::react::RuntimeExecutor runtimeExecutor);
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

  const std::function<void(Job)> scheduleOnJS = nullptr;
  const std::shared_ptr<facebook::react::CallInvoker> getJSCallInvoker() const;

 protected:
  facebook::jsi::Runtime &rnRuntime_;
#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
  facebook::react::RuntimeExecutor runtimeExecutor_ = nullptr;
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED
  const std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker_ = nullptr;
};

} // namespace worklets
