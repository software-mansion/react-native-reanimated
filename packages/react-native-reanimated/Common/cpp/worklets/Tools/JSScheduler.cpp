#include <worklets/Tools/JSScheduler.h>

#include <utility>

using namespace facebook;
using namespace react;

namespace worklets {

JSScheduler::JSScheduler(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<CallInvoker> &jsCallInvoker)
    : scheduleOnJS([&](Job job) {
        jsCallInvoker_->invokeAsync(
            [job = std::move(job), &rt = rnRuntime_] { job(rt); });
      }),
      rnRuntime_(rnRuntime),
      jsCallInvoker_(jsCallInvoker) {}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
// With `runtimeExecutor`.
JSScheduler::JSScheduler(
    jsi::Runtime &rnRuntime,
    RuntimeExecutor runtimeExecutor)
    : scheduleOnJS([&](Job job) {
        runtimeExecutor_(
            [job = std::move(job)](jsi::Runtime &runtime) { job(runtime); });
      }),
      rnRuntime_(rnRuntime),
      runtimeExecutor_(runtimeExecutor) {}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

const std::shared_ptr<CallInvoker> JSScheduler::getJSCallInvoker() const {
  assert(
      jsCallInvoker_ != nullptr &&
      "[Reanimated] Expected jsCallInvoker, got nullptr instead.");
  return jsCallInvoker_;
}

} // namespace worklets
