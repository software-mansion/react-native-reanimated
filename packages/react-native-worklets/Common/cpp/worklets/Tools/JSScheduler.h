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
      const std::shared_ptr<CallInvoker> &jsCallInvoker,
      std::function<bool()> &&isJavaScriptQueue)
      : rnRuntime_(rnRuntime), jsCallInvoker_(jsCallInvoker), isJavaScriptQueue_(isJavaScriptQueue) {}

  void scheduleOnJS(std::function<void(jsi::Runtime &rt)> job);

  void invokeSyncOnJS(const std::function<void(jsi::Runtime &rt)> &job);

  bool canInvokeSyncOnJS();

 protected:
  jsi::Runtime &rnRuntime_;
  const std::shared_ptr<CallInvoker> jsCallInvoker_;
  const std::function<bool()> isJavaScriptQueue_;
};

} // namespace worklets
