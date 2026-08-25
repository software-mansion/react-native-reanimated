#include <reanimated/Compat/WorkletsApi.h>
#include <worklets/Tools/UIScheduler.h>

namespace worklets {

Serializable::~Serializable() = default;

void scheduleOnUI(const std::shared_ptr<UIScheduler> &uiScheduler, const std::function<void()> &job) {
  uiScheduler->scheduleOnUI(job);
}

} // namespace worklets
