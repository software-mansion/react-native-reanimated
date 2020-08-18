#include "REIOSScheduler.h"

namespace reanimated {

using namespace facebook;
using namespace react;

REIOSScheduler::REIOSScheduler(std::shared_ptr<CallInvoker> jsInvoker) {
  this->jsInvoker = jsInvoker;
}

void REIOSScheduler::scheduleOnUI(std::function<void()> job) {
  Scheduler::scheduleOnUI(job);
  dispatch_async(dispatch_get_main_queue(), ^{
    triggerUI();
  });
}

void REIOSScheduler::scheduleOnJS(std::function<void()> job) {
  Scheduler::scheduleOnJS(job);
  jsInvoker->invokeAsync([this]{
    triggerJS();
  });
}

REIOSScheduler::~REIOSScheduler(){}

}
