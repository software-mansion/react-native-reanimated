//
//  Mapper.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 20/03/2020.
//

#include "Mapper.h"

Mapper::Mapper(int id,
              std::shared_ptr<Applier> applier,
              std::vector<int> inputIds,
              std::vector<int> outputIds) {
  this->id = id;
  this->applier = applier;
  this->inputIds = std::move(inputIds);
  this->outputIds = std::move(outputIds);
}

void Mapper::execute(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module) {
  initialized = true;
  applier->apply(rt, module);
}

std::shared_ptr<Mapper> Mapper::createMapper(int id,
                                     std::shared_ptr<Applier> applier,
                                     std::shared_ptr<SharedValueRegistry> sharedValueRegistry) {
  if (applier->sharedValueIds.size() < 2) {
    return nullptr;
  }
  int inputId = applier->sharedValueIds[0];
  int outputId = applier->sharedValueIds[1];
  
  std::shared_ptr<SharedValue> input = sharedValueRegistry->getSharedValue(inputId);
  std::shared_ptr<SharedValue> output = sharedValueRegistry->getSharedValue(outputId);
  
  if (input == nullptr or output == nullptr) {
    return nullptr;
  }
  
  return std::shared_ptr<Mapper>(new Mapper(id, applier, input->getSharedValues(), output->getSharedValues()));
}
