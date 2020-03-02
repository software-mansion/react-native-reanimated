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
  [this->uiManager addUIBlock:^(__unused RCTUIManager *manager, __unused NSDictionary<NSNumber *, UIView *> *viewRegistry) {
   triggerUI();
  }];
}

void IOSScheduler::scheduleOnJS(std::function<void()> job) {
  jsInvoker->invokeAsync([this]{
    triggerJS();
  });
}

void IOSScheduler::setUIManager(RCTUIManager *uiManager) {
  this->uiManager = uiManager;
}

IOSScheduler::~IOSScheduler(){}
 
