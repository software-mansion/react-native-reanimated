#include "JSScheduler.h"

#include <utility>

namespace reanimated {

void JSScheduler::scheduleOnJS(std::function<void(jsi::Runtime &rt)> job) {
  if (runtimeExecutor_ != nullptr) {
    runtimeExecutor_(
        [job = std::move(job)](jsi::Runtime &runtime) { job(runtime); });
  } else if (jsCallInvoker_ != nullptr) {
    jsCallInvoker_->invokeAsync(
        [job = std::move(job), &rt = rnRuntime_] { job(rt); });
  } else {
    // TODO: Log/Throw that something is no yes
  }
}

} // namespace reanimated
