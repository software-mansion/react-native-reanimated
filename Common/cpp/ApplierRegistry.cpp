//
// Created by Szymon Kapala on 2020-02-12.
//

#include<ApplierRegistry.h>
#include "Logger.h"

void ApplierRegistry::registerApplierForRender(int id, std::shared_ptr<Applier> applier) {
  renderAppliers[id] = applier;
}

void ApplierRegistry::unregisterApplierFromRender(int id) {
  if (renderAppliers.size() > 0) {
    if (renderAppliers.find(id) != renderAppliers.end()) {
      renderAppliers.erase(id);
    }
  }
}

void ApplierRegistry::registerApplierForEvent(int id, std::string eventName, std::shared_ptr<Applier> applier) {
  eventMapping[id] = eventName;
  eventAppliers[eventName][id] = applier;
}

void ApplierRegistry::unregisterApplierFromEvent(int id) {
  if (eventMapping.find(id) == eventMapping.end()) return;
  std::string eventName = eventMapping[id];
  eventMapping.erase(id);
  eventAppliers[eventName].erase(id);
  Logger::log((int)eventAppliers[eventName].size());
}

bool ApplierRegistry::notEmpty() {
  return renderAppliers.size() > 0;
}

void ApplierRegistry::render(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module) {
  auto appliersCopy = renderAppliers;
  for (auto & p : appliersCopy) { // apply can add new appliers
    int id = p.first;
    auto & applier = p.second;
    if (applier->apply(rt, module)) {
      unregisterApplierFromRender(id);
    }
  }
}

void ApplierRegistry::event(jsi::Runtime &rt, std::string eventName, std::shared_ptr<BaseWorkletModule> module) {
  std::vector<int> idsToRemove;
  auto appliersCopy = eventAppliers[eventName];  for (auto & p : appliersCopy) {  // apply can add new appliers
    int id = p.first;
    auto & applier = p.second;
    if (applier->apply(rt, module)) {
      idsToRemove.push_back(id);
    }
  }

  for (auto id : idsToRemove) {
    unregisterApplierFromEvent(id);
  }
};

bool ApplierRegistry::anyApplierRegisteredForEvent(std::string eventName) {
  if (eventAppliers.find(eventName) == eventAppliers.end()) {
    return false;
  }
  return eventAppliers[eventName].size() > 0;
}


