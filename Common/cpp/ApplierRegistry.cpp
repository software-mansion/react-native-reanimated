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

void ApplierRegistry::evaluateAppliers(
                                     jsi::Runtime &rt,
                                     std::shared_ptr<BaseWorkletModule> module,
                                     std::unordered_map<int, std::shared_ptr<Applier>> appliers,
                                     std::function<void(int)> unregisterApplier) { // should copy
  std::vector<int> toRemove;
  for (auto & p : appliers) {
    int id = p.first;
    auto & applier = p.second;
    if (applier->apply(rt, module)) {
      toRemove.push_back(id);
    }
  }
  
  for (auto id : toRemove) {
    unregisterApplier(id);
  }
}

void ApplierRegistry::render(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module) {
  evaluateAppliers(rt,
                   module,
                   renderAppliers,
                   [=] (int id) {
    unregisterApplierFromRender(id);
  });
}

void ApplierRegistry::event(jsi::Runtime &rt, std::string eventName, std::shared_ptr<BaseWorkletModule> module) {
  evaluateAppliers(rt,
                   module,
                   eventAppliers[eventName],
                   [=] (int id) {
    unregisterApplierFromEvent(id);
  });
};

bool ApplierRegistry::anyApplierRegisteredForEvent(std::string eventName) {
  if (eventAppliers.find(eventName) == eventAppliers.end()) {
    return false;
  }
  return eventAppliers[eventName].size() > 0;
}


std::unordered_map<int, std::shared_ptr<Applier>> ApplierRegistry::getRenderAppliers() const
{
  return this->renderAppliers;
}

std::map<int, std::string> ApplierRegistry::getEventMapping() const
{
  return this->eventMapping;
}

