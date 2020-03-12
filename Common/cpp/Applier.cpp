//
// Created by Szymon Kapala on 2020-02-12.
//

#include "Applier.h"

Applier::Applier(int applierId, std::shared_ptr<Worklet> worklet, std::vector<std::shared_ptr<SharedValue>> sharedValues) {
  this->worklet = worklet;
  this->sharedValues = sharedValues;
  this->applierId = applierId;
}

Applier::~Applier() {}

bool Applier::apply(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module) {
  jsi::Value * args = new jsi::Value[sharedValues.size()];
  for (int i = 0; i < sharedValues.size(); ++i) {
    args[i] = jsi::Value(rt, sharedValues[i]->asParameter(rt));
  }

  module->setWorkletId(worklet->workletId);
  module->setApplierId(applierId);

  jsi::Value returnValue = worklet->body->callWithThis(rt,
                            jsi::Object::createFromHostObject(rt, module),
                            static_cast<const jsi::Value*>(args),
                            (size_t)sharedValues.size());
  bool shouldFinish = (returnValue.isBool()) ? returnValue.getBool() : false;

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

