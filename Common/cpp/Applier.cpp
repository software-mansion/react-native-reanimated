//
// Created by Szymon Kapala on 2020-02-12.
//

#include "Applier.h"
#include <string>
#include "Logger.h"
#include <thread>

Applier::Applier(
      int applierId,
      std::shared_ptr<Worklet> worklet,
      std::vector<std::shared_ptr<SharedValue>> sharedValues,
      std::shared_ptr<ErrorHandler> errorHandler) {
  this->worklet = worklet;
  this->sharedValues = sharedValues;
  this->applierId = applierId;
  this->errorHandler = errorHandler;
}

Applier::~Applier() {}

bool Applier::apply(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module) {
  jsi::Value * args = new jsi::Value[sharedValues.size()];
  for (int i = 0; i < sharedValues.size(); ++i) {
    args[i] = jsi::Value(rt, sharedValues[i]->asParameter(rt));
  }

  module->setWorkletId(worklet->workletId);
  module->setApplierId(applierId);

  bool shouldFinish = true;
  try {
    jsi::Value returnValue = worklet->body->callWithThis(rt,
                              jsi::Object::createFromHostObject(rt, module),
                              static_cast<const jsi::Value*>(args),
                              (size_t)sharedValues.size());
    shouldFinish = (returnValue.isBool()) ? returnValue.getBool() : false;
  } catch(const std::exception &e) {
    std::string message = "worklet error: ";
    message += e.what();
    this->errorHandler->raise(message.c_str());
  }

  if (shouldFinish) {
    finish();
  }
  
  delete [] args;
  return shouldFinish;
}

void Applier::addOnFinishListener(const std::function<void()> &listener) {
  onFinishListeners.push_back(listener);
}

void Applier::finish() {
  while (onFinishListeners.size() > 0) {
    onFinishListeners.back()();
    onFinishListeners.pop_back();
  }
}

