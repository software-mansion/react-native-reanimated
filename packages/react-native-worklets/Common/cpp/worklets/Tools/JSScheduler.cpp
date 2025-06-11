#include <worklets/Tools/JSScheduler.h>

#include <utility>

namespace worklets {

void JSScheduler::scheduleOnJS(Job job) {
  jsCallInvoker_->invokeAsync(
      [job = std::move(job), &rt = rnRuntime_] { job(rt); });
}

#ifdef WORKLETS_EXPERIMENTAL_BUNDLING
void JSScheduler::invokeSync_UNSAFE(Job job) {
  job(rnRuntime_);
}
#endif // WORKLETS_EXPERIMENTAL_BUNDLING

} // namespace worklets
