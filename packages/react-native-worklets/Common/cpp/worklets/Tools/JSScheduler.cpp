#include <react/debug/react_native_assert.h>
#include <worklets/Tools/JSScheduler.h>

#include <utility>

namespace worklets {

void JSScheduler::scheduleOnJS(Job job) {
  jsCallInvoker_->invokeAsync(
      [job = std::move(job), &rt = rnRuntime_] { job(rt); });
}

bool JSScheduler::canInvokeSyncOnJS() {
  return isJavaScriptQueue_();
}

void JSScheduler::invokeSyncOnJS(Job job) {
  react_native_assert(
      canInvokeSyncOnJS() &&
      "JSScheduler::invokeSyncOnJS should only be called from the JS thread");
  job(rnRuntime_);
}

} // namespace worklets
