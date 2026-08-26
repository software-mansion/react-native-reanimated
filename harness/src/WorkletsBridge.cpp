#include <reanimated/Compat/WorkletsApi.h>
#include <worklets/Tools/UIScheduler.h>

#include <utility>

namespace worklets {

Serializable::~Serializable() = default;

void scheduleOnUI(const std::shared_ptr<UIScheduler> &uiScheduler, const std::function<void()> &job) {
  uiScheduler->scheduleOnUI(job);
}

#ifdef HARNESS_PROXY_REGISTRY
void UIScheduler::scheduleOnUI(std::function<void()> job) {
  uiJobs_.push(std::move(job));
}

void UIScheduler::triggerUI() {
  scheduledOnUI_ = false;
  while (!uiJobs_.empty()) {
    uiJobs_.pop()();
  }
}

bool UIScheduler::isOnUIThread() const {
  return queryIsOnUIThread();
}

bool isOnUIThread(const std::shared_ptr<UIScheduler> &uiScheduler) {
  return uiScheduler->isOnUIThread();
}
#endif

} // namespace worklets
