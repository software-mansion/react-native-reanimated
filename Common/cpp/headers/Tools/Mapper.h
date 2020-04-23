//
//  Mapper.hpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 20/03/2020.
//

#ifndef Mapper_h
#define Mapper_h

#include <stdio.h>
#include "Applier.h"
#include "SharedValueRegistry.h"

using namespace facebook;

class Mapper {
  std::shared_ptr<Applier> applier;
  std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
public:
  bool dirty = true;
  Mapper(int id,
          std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
          std::shared_ptr<Applier> applier,
          std::vector<int> inputIds,
          std::vector<int> outputIds
         );
  void execute(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module);
  static std::shared_ptr<Mapper> createMapper(int id,
                                       std::shared_ptr<Applier> applier,
                                       std::shared_ptr<SharedValueRegistry> sharedValueRegistry);
  virtual ~Mapper();
  
  std::vector<int> inputIds;
  std::vector<int> outputIds;
  int id;
  bool initialized = false;
};

#endif /* Mapper_h */
