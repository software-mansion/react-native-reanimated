#pragma once

#include <stdio.h>
#include "Scheduler.h"
#import <ReactCommon/CallInvoker.h>
#import <React/RCTUIManager.h>

namespace reanimated
{

using namespace facebook;
using namespace react;

class REIOSScheduler : public Scheduler {
  std::shared_ptr<CallInvoker> jsInvoker;
  public:
  REIOSScheduler(std::shared_ptr<CallInvoker> jsInvoker);
  void scheduleOnUI(std::function<void()> job) override;
  void scheduleOnJS(std::function<void()> job) override;
  virtual ~REIOSScheduler();
};

} // namespace reanimated
