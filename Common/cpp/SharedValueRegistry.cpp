//
// Created by Szymon Kapala on 2020-02-11.
//

#include "SharedValueRegistry.h"

void SharedValueRegistry::registerSharedValue(int id, std::shared_ptr<SharedValue> ptr) {
  sharedValueMap[id] = ptr;
}

void SharedValueRegistry::unregisterSharedValue(int id) {
  sharedValueMap.erase(id);
}

std::shared_ptr<SharedValue> SharedValueRegistry::getSharedValue(int id) {
  return sharedValueMap[id];
}
