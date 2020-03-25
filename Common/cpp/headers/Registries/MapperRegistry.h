//
//  MapperRegistry.hpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 20/03/2020.
//

#ifndef MapperRegistry_h
#define MapperRegistry_h

#include <stdio.h>
#include "Mapper.h"

class MapperRegistry {
  std::unordered_map<int, std::shared_ptr<Mapper>> mappers;
  std::vector<std::shared_ptr<Mapper>> sortedMappers;
  std::shared_ptr<SharedValueRegistry> sharedValueRegistry;
  void updateOrder();
public:
  MapperRegistry(std::shared_ptr<SharedValueRegistry> sharedValueRegistry);
  void addMapper(std::shared_ptr<Mapper> mapper);
  void removeMapper(int id);
  void execute(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module);
  virtual ~MapperRegistry();
  
  bool updatedSinceLastExecute = false;
};

#endif /* MapperRegistry_h */
