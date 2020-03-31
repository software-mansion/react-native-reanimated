//
// Created by Szymon Kapala on 2020-02-11.
//
#include "WorkletRegistry.h"

void WorkletRegistry::registerWorklet(int id, std::shared_ptr<jsi::Function> ptr, int length) {
  std::shared_ptr<Worklet> worklet(new Worklet());
  worklet->workletId = id;
  worklet->body = ptr;
  worklet->length = length;
  workletMap[id] = worklet;
}

void WorkletRegistry::unregisterWorklet(int id) {
  workletMap.erase(id);
}

std::shared_ptr<Worklet> WorkletRegistry::getWorklet(int id) {
  if (workletMap.count(id) > 0) {
    return workletMap[id];
  }
  
  return nullptr;
}

void WorkletRegistry::setWorkletListener(int workletId, std::shared_ptr<std::function<void()>> listener) {
  workletMap[workletId]->listener = listener;
}

std::unordered_map<int, std::shared_ptr<Worklet>> WorkletRegistry::getWorkletMap() const {
  return this->workletMap;
}
