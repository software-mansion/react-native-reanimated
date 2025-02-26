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

} // namespace worklets
