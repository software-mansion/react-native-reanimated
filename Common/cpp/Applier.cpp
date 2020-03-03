//
// Created by Szymon Kapala on 2020-02-12.
//

#include "Applier.h"

Applier::Applier(std::shared_ptr<jsi::Function> worklet, std::vector<std::shared_ptr<SharedValue>> sharedValues) {
  this->worklet = worklet;
  this->sharedValues = sharedValues;
}

Applier::~Applier() {}

bool Applier::apply(jsi::Runtime &rt, std::shared_ptr<jsi::HostObject> module) {
  jsi::Value * args = new jsi::Value[sharedValues.size()];
  for (int i = 0; i < sharedValues.size(); ++i) {
    args[i] = jsi::Value(rt, sharedValues[i]->asParameter(rt));
  }

  bool shouldFinish = worklet->callWithThis(rt,
                            jsi::Object::createFromHostObject(rt, module),
                            static_cast<const jsi::Value*>(args),
                            (size_t)sharedValues.size()).getBool();

  delete [] args;
  return shouldFinish;
}

