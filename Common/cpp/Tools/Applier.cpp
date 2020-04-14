//
// Created by Szymon Kapala on 2020-02-12.
//

#include "Applier.h"
#include <string>
#include "Logger.h"
#include <thread>
#include "SpeedChecker.h"

Applier::Applier(
      int applierId,
      std::shared_ptr<Worklet> worklet,
      std::vector<std::shared_ptr<SharedValue>> sharedValues,
      std::shared_ptr<ErrorHandler> errorHandler,
      std::shared_ptr<SharedValueRegistry> sharedValueRegistry
      ) {
  this->worklet = worklet;
  this->sharedValues = sharedValues;
  this->errorHandler = errorHandler;
  this->applierId = applierId;
  this->sharedValueRegistry = sharedValueRegistry;
}

Applier::~Applier() {}

bool Applier::apply(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module) {
  bool shouldFinish = false;
  
  jsi::Value * args = new jsi::Value[sharedValues.size()];
  
  SpeedChecker::checkSpeed("prepare values: ", [=, &rt](){
    for (int i = 0; i < sharedValues.size(); ++i) {
       args[i] = jsi::Value(rt, sharedValues[i]->asParameter(rt));
    }
  });

  module->setWorkletId(worklet->workletId);
  module->setApplierId(applierId);
  module->setJustStarted(justStarted);

  jsi::Value returnValue;
  
  SpeedChecker::checkSpeed("worklet exec: ", [=, &rt, &returnValue](){
     returnValue = worklet->body->callWithThis(rt,
     jsi::Object::createFromHostObject(rt, module),
     static_cast<const jsi::Value*>(args),
     (size_t)sharedValues.size());
  });
  
  shouldFinish = (returnValue.isBool()) ? returnValue.getBool() : false;
  delete [] args;

  justStarted = false;
  
  if (shouldFinish) {
    finish(rt);
  }
  
  return shouldFinish;
}

void Applier::addOnFinishListener(const std::function<void()> &listener) {
  onFinishListeners.push_back(listener);
}

void Applier::finish(jsi::Runtime &rt) {
  while (onFinishListeners.size() > 0) {
    onFinishListeners.back()();
    onFinishListeners.pop_back();
  }
  
  jsi::Object container = rt
  .global()
  .getPropertyAsObject(rt, "Reanimated")
  .getPropertyAsObject(rt, "container");
  std::string propName = std::to_string(this->applierId);
  if (container.hasProperty(rt, propName.c_str())) {
    container.setProperty(rt, propName.c_str(), jsi::Value::undefined());
  }
}

