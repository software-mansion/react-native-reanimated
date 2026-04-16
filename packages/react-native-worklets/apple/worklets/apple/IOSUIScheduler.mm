#import <worklets/apple/IOSUIScheduler.h>

namespace worklets {

using namespace facebook;
using namespace react;

void IOSUIScheduler::scheduleOnUI(std::function<void()> job)
{
  if ([NSThread isMainThread]) {
    job();
    return;
  }

  UIScheduler::scheduleOnUI(job);

  if (!scheduledOnUI_) {
    dispatch_async(dispatch_get_main_queue(), [weakThis = weak_from_this()] {
      // Before triggering the UI, we check if the weak pointer is still valid to avoid possible dangling pointer
      // issues, because when this async callback here gets executed, the original `IOSUIScheduler` object may have been
      // destroyed.
      if (auto strongThis = weakThis.lock()) {
        strongThis->triggerUI();
      }
    });
  }
}

} // namespace worklets
