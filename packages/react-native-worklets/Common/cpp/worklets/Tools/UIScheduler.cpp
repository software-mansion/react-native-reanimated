#include <worklets/Tools/UIScheduler.h>

#include <optional>
#include <utility>

namespace worklets {

static thread_local std::optional<bool> tls_isOnUIThread;

void UIScheduler::scheduleOnUI(std::function<void()> job) {
  uiJobs_.push(std::move(job));
}

bool UIScheduler::scheduleOnUIFromUIThread(std::function<void()> &job) {
  if (drainingUI_) {
    // The active drain runs the job after the older ones.
    uiJobs_.push(std::move(job));
    return true;
  }
  if (uiJobs_.empty()) {
    // Only the UI thread pops, so no older job is pending.
    job();
    return true;
  }
  // Older jobs from other threads wait for their trigger. Draining them here would run them under the caller's locks.
  return false;
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
