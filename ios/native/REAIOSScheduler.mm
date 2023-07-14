#import <RNReanimated/REAIOSScheduler.h>
#import <RNReanimated/RuntimeManager.h>

namespace reanimated {

using namespace facebook;
using namespace react;

REAIOSScheduler::REAIOSScheduler(std::shared_ptr<CallInvoker> jsInvoker)
{
  this->jsCallInvoker_ = jsInvoker;
}

void REAIOSScheduler::scheduleOnUI(std::function<void()> job)
{
  const auto runtimeManagerExpired = runtimeManager.expired();
  if (runtimeManagerExpired) {
    return;
  }

  if ([NSThread isMainThread]) {
    if (!runtimeManagerExpired) {
      job();
    }
    return;
  }

  Scheduler::scheduleOnUI(job);

  if (!this->scheduledOnUI) {
    __block std::weak_ptr<RuntimeManager> blockRuntimeManager = runtimeManager;

    dispatch_async(dispatch_get_main_queue(), ^{
      if (blockRuntimeManager.lock()) {
        triggerUI();
      }
    });
  }
}

} // namespace reanimated
