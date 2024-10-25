#include <worklets/Tools/JSScheduler.h>

#include <utility>

namespace worklets {

JSScheduler::JSScheduler(
    facebook::jsi::Runtime &rnRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker)
    : scheduleOnJS([&](Job job) {
        jsCallInvoker_->invokeAsync(
            [job = std::move(job), &rt = rnRuntime_] { job(rt); });
      }),
      rnRuntime_(rnRuntime),
      jsCallInvoker_(jsCallInvoker) {}

#if REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED)
// With `runtimeExecutor`.
JSScheduler::JSScheduler(
    facebook::jsi::Runtime &rnRuntime,
    facebook::react::RuntimeExecutor runtimeExecutor)
    : scheduleOnJS([&](Job job) {
        runtimeExecutor_(
            [job = std::move(job)](facebook::jsi::Runtime &runtime) {
              job(runtime);
            });
      }),
      rnRuntime_(rnRuntime),
      runtimeExecutor_(runtimeExecutor) {}
#endif // REACT_NATIVE_MINOR_VERSION >= 74 && defined(RCT_NEW_ARCH_ENABLED

const std::shared_ptr<facebook::react::CallInvoker>
JSScheduler::getJSCallInvoker() const {
  assert(
      jsCallInvoker_ != nullptr &&
      "[Reanimated] Expected jsCallInvoker, got nullptr instead.");
  return jsCallInvoker_;
}

} // namespace worklets
