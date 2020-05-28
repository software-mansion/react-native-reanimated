#pragma once

#include <stdio.h>
#include "Scheduler.h"
#import <ReactCommon/CallInvoker.h>
#import <React/RCTUIManager.h>

using namespace facebook;
using namespace react;

class IOSScheduler : public Scheduler {
  std::shared_ptr<CallInvoker> jsInvoker;
  public:
  IOSScheduler(std::shared_ptr<CallInvoker> jsInvoker);
  void scheduleOnUI(std::function<void()> job) override;
  void scheduleOnJS(std::function<void()> job) override;
  virtual ~IOSScheduler();
};
