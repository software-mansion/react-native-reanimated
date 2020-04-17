//
//  Mapper.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 20/03/2020.
//

#include "Mapper.h"

Mapper::Mapper(int id,
              std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
              std::shared_ptr<Applier> applier,
              std::vector<int> inputIds,
              std::vector<int> outputIds) {
  this->id = id;
  this->applier = applier;
  this->inputIds = std::move(inputIds);
  this->outputIds = std::move(outputIds);
  this->sharedValueRegistry = sharedValueRegistry;
}

void Mapper::execute(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module) {
  initialized = true;
  dirty = false;
  applier->apply(rt, module);
}

std::shared_ptr<Mapper> Mapper::createMapper(int id,
                                     std::shared_ptr<Applier> applier,
                                     std::shared_ptr<SharedValueRegistry> sharedValueRegistry) {
  if (applier->sharedValues.size() < 2) {
    return nullptr;
  }
  
  std::shared_ptr<SharedValue> input = applier->sharedValues[0];
  std::shared_ptr<SharedValue> output = applier->sharedValues[1];
  
  if (input == nullptr or output == nullptr) {
    return nullptr;
  }
  
  std::vector<int> inputSharedValues = input->getSharedValues();
  
  std::shared_ptr<Mapper> mapper(new Mapper(id, sharedValueRegistry, applier, inputSharedValues, output->getSharedValues()));
  
  for (int svId : inputSharedValues) {
    sharedValueRegistry->getSharedValue(svId)->registerForDirty(id, [=](){
      mapper->dirty = true;
    });
  }
  
  return mapper;
}

Mapper::~Mapper() {
  for (int svId : inputIds) {
    sharedValueRegistry->getSharedValue(svId)->unregisterFromDirty(id);
  }
}
