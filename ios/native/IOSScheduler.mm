#include "IOSScheduler.h"

using namespace facebook;
using namespace react;

IOSScheduler::IOSScheduler(std::shared_ptr<CallInvoker> jsInvoker) {
  this->jsInvoker = jsInvoker;
}

void IOSScheduler::scheduleOnUI(std::function<void()> job) {
  Scheduler::scheduleOnUI(job);
  dispatch_async(dispatch_get_main_queue(), ^{
    triggerUI();
  });
}

void IOSScheduler::scheduleOnJS(std::function<void()> job) {
  Scheduler::scheduleOnJS(job);
  jsInvoker->invokeAsync([this]{
    triggerJS();
  });
}

IOSScheduler::~IOSScheduler(){}

