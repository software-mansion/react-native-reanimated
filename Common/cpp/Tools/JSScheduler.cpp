#include "JSScheduler.h"
#include <react/debug/react_native_assert.h>

using namespace facebook;
using namespace react;

namespace reanimated {
JSScheduler::JSScheduler(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<CallInvoker> &jsCallInvoker)
    : rnRuntime_(rnRuntime),
      jsCallInvoker_(jsCallInvoker),
      scheduleOnJS([&](Job job) {
        jsCallInvoker_->invokeAsync(
            [job = std::move(job), &rt = rnRuntime_] { job(rt); });
      }) {}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
// With `runtimeExecutor`.
JSScheduler::JSScheduler(
    jsi::Runtime &rnRuntime,
    RuntimeExecutor runtimeExecutor)
    : rnRuntime_(rnRuntime),
      runtimeExecutor_(runtimeExecutor),
      scheduleOnJS([&](Job job) {
        runtimeExecutor_(
            [job = std::move(job)](jsi::Runtime &runtime) { job(runtime); });
      }) {}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

// DO NOT USE OR YOU WILL BE PROMOTED
const std::shared_ptr<CallInvoker> JSScheduler::getJSCallInvoker() const {
  react_native_assert(jsCallInvoker_ != nullptr);
  return jsCallInvoker_;
}

} // namespace reanimated
