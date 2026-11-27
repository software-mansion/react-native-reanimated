#include <worklets/Tools/UIScheduler.h>

#include <optional>
#include <utility>

namespace worklets {

static thread_local std::optional<bool> tls_isOnUIThread;

void UIScheduler::scheduleOnUI(std::function<void()> job) {
  uiJobs_.push(std::move(job));
}

bool UIScheduler::canInvokeSync() const {
  return isOnUIThread() && !drainingUI_ && uiJobs_.empty();
}

void UIScheduler::invokeSync(const std::function<void()> &job, const std::function<void()> &requestTrigger) {
  drainingUI_ = true;
  try {
    job();
  } catch (...) {
    drainingUI_ = false;
    if (!uiJobs_.empty()) {
      requestTrigger();
    }
    throw;
  }
  drainingUI_ = false;
  if (!uiJobs_.empty()) {
    requestTrigger();
  }
}

void UIScheduler::triggerUI() {
  if (drainingUI_) {
    return;
  }
  drainingUI_ = true;
  try {
    scheduledOnUI_ = false;
    while (!uiJobs_.empty()) {
      const auto job = uiJobs_.pop();
      job();
    }
  } catch (...) {
    drainingUI_ = false;
    throw;
  }
  drainingUI_ = false;
}

bool UIScheduler::isOnUIThread() const {
  if (!tls_isOnUIThread.has_value()) {
    tls_isOnUIThread = queryIsOnUIThread();
  }
  return *tls_isOnUIThread;
}

} // namespace worklets
