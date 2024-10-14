#include <worklets/Tools/UIScheduler.h>
#include <worklets/WorkletRuntime/ReanimatedRuntime.h>

#include <utility>

namespace worklets {

void UIScheduler::scheduleOnUI(std::function<void()> job) {
  uiJobs_.push(std::move(job));
}

void UIScheduler::triggerUI() {
  scheduledOnUI_ = false;
  while (!uiJobs_.empty()) {
    const auto job = uiJobs_.pop();
    job();
  }
}

} // namespace worklets
