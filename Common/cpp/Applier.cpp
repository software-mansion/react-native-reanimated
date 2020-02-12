//
// Created by Szymon Kapala on 2020-02-12.
//

#include "Applier.h"

Applier::Applier(std::shared_ptr<jsi::Function> worklet, std::vector<std::shared_ptr<SharedValue>> sharedValues) {
  this->worklet = worklet;
  this->sharedValues = sharedValues;
}

Applier::~Applier() {}


bool Applier::apply(jsi::Runtime &rt, jsi::Object module) {
  //ToDo
}

