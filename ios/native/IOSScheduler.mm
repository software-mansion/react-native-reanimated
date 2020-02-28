//
//  IOSScheduler.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 27/02/2020.
//

#include "IOSScheduler.h"

IOSSCheduler::IOSScheduler(std::shared_ptr<JSCallInvoker> jsInvoker) {
  this->jsInvoker = jsInvoker;
}

void IOSSCheduler::scheduleOnUI(std::function<void()> job) {
  [this.uiManager addUIBlock:^(__unused RCTUIManager *manager, __unused NSDictionary<NSNumber *, UIView *> *viewRegistry) {
   triggerUI();
  }];
}

void IOSSCheduler::scheduleOnJS(std::function<void()> job) {
  jsInvoker->invokeAsync(std::move([this]{
    triggerJS();
  }));
}

void IOSSCheduler::setUIManager(RCTUIManager *uiManager) {
  this.uiManger = uiManager;
}

IOSSCheduler::~IOSScheduler(){}
 
