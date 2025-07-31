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
    // NOTE: there is a possible race condition that when the `dispatch_async` block here gets executed, the associated `IOSUIScheduler` object may have already been destroyed, that will cause a dangling pointer crash.
    dispatch_async(dispatch_get_main_queue(), [weakThis = weak_from_this()] {
      if (auto strongThis = weakThis.lock()) {
        strongThis->triggerUI();
      }
    });
  }
}

} // namespace worklets
