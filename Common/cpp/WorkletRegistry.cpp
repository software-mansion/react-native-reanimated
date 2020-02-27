//
// Created by Szymon Kapala on 2020-02-11.
//
#include "WorkletRegistry.h"

void WorkletRegistry::registerWorklet(int id, std::shared_ptr<jsi::Function> ptr) {
  workletMap[id] = ptr;
}

void WorkletRegistry::unregisterWorklet(int id) {
  workletMap.erase(id);
}

std::shared_ptr<jsi::Function> WorkletRegistry::getWorklet(int id) {
  return workletMap[id];
}
