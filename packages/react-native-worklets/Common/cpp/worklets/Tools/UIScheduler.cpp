#include <worklets/Tools/UIScheduler.h>

#include <optional>
#include <utility>

namespace worklets {

static thread_local std::optional<bool> tls_isOnUIThread;

void UIScheduler::scheduleOnUI(std::function<void()> job) {
  uiJobs_.push(std::move(job));
}

void UIScheduler::triggerUI() {
  if (drainingUI_) {
    return;
  }
  drainingUI_ = true;
  struct ResetDraining {
    bool &draining;
    ~ResetDraining() {
      draining = false;
    }
  } reset{drainingUI_};
  scheduledOnUI_ = false;
  while (!uiJobs_.empty()) {
    const auto job = uiJobs_.pop();
    job();
  }
}

bool UIScheduler::isOnUIThread() const {
  if (!tls_isOnUIThread.has_value()) {
    tls_isOnUIThread = queryIsOnUIThread();
  }
  return *tls_isOnUIThread;
}

} // namespace worklets
