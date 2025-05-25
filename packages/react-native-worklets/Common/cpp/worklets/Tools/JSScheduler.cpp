#include <worklets/Tools/JSScheduler.h>

#include <utility>

namespace worklets {

void JSScheduler::scheduleOnJS(Job job) {
  jsCallInvoker_->invokeAsync(
      [job = std::move(job), &rt = rnRuntime_] { job(rt); });
}

} // namespace worklets
