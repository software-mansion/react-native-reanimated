#include "JSScheduler.h"

#include <utility>

namespace reanimated {

void JSScheduler::scheduleOnJS(std::function<void()> &&job) {
  jsCallInvoker_->invokeAsync(std::move(job));
}

} // namespace reanimated
