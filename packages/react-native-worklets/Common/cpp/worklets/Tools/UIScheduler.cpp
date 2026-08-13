#include <worklets/Tools/UIScheduler.h>

#include <utility>

namespace worklets {

static thread_local bool tls_isOnUIThread = false;

void UIScheduler::scheduleOnUI(std::function<void()> job) {
  uiJobs_.push(std::move(job));
}

void UIScheduler::triggerUI() {
  tls_isOnUIThread = true;
  scheduledOnUI_ = false;
  while (!uiJobs_.empty()) {
    const auto job = uiJobs_.pop();
    job();
  }
}

bool UIScheduler::isOnUIThread() {
  return tls_isOnUIThread;
}

} // namespace worklets
