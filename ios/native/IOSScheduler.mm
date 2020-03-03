//
//  IOSScheduler.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 27/02/2020.
//

#include "IOSScheduler.h"

using namespace facebook;
using namespace react;

IOSScheduler::IOSScheduler(std::shared_ptr<JSCallInvoker> jsInvoker) {
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

void IOSScheduler::setUIManager(RCTUIManager *uiManager) {
  this->uiManager = uiManager;
}

IOSScheduler::~IOSScheduler(){}
 
