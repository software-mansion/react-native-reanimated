#import <RNReanimated/REAIOSUIScheduler.h>
#import <RNReanimated/RuntimeManager.h>

namespace reanimated {

using namespace facebook;
using namespace react;

void REAIOSUIScheduler::scheduleOnUI(std::function<void()> job)
{
  const auto runtimeManager = weakRuntimeManager_.lock();
  if (!runtimeManager) {
    return;
  }

  if ([NSThread isMainThread]) {
    job();
    return;
  }

  UIScheduler::scheduleOnUI(job);

  if (!scheduledOnUI_) {
    __block std::weak_ptr<RuntimeManager> blockRuntimeManager = weakRuntimeManager_;

    dispatch_async(dispatch_get_main_queue(), ^{
      if (const auto runtimeManager = blockRuntimeManager.lock()) {
        triggerUI();
      }
    });
  }
}

} // namespace reanimated
