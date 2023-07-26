#import <RNReanimated/REAIOSUIScheduler.h>

namespace reanimated {

using namespace facebook;
using namespace react;

void REAIOSUIScheduler::scheduleOnUI(std::function<void()> job)
{
  // TODO: check if runtime is alive

  if ([NSThread isMainThread]) {
    job();
    return;
  }

  UIScheduler::scheduleOnUI(job);

  if (!scheduledOnUI_) {
    dispatch_async(dispatch_get_main_queue(), ^{
      // TODO: check if runtime is alive

      triggerUI();
    });
  }
}

} // namespace reanimated
