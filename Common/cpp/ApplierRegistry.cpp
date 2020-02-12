//
// Created by Szymon Kapala on 2020-02-12.
//

#include<ApplierRegistry.h>

void ApplierRegistry::registerApplierForRender(int id, std::shared_ptr<Applier> applier) {
  renderAppliers[id] = applier;
}

void ApplierRegistry::unregisterApplierFromRender(int id) {
  if (renderAppliers.find(id) != renderAppliers.end()) {
    renderAppliers.erase(id);
  }
}

void ApplierRegistry::registerApplierForEvent(int id, std::string eventName, std::shared_ptr<Applier> applier) {
  eventAppliers[id] = eventName;
  eventMapping[eventName][id] = applier;
}

void ApplierRegistry::unregisterApplierFromEvent(int id) {
  if (eventMapping.find(id) == eventMapping.end()) return;
  std::string eventName = eventMapping[id];
  eventMapping.erase(id);
  eventAppliers[eventName].erase(id);
}

void ApplierRegistry::render(Runtime &rt, const jsi::Object &module) {
  std::vector<int> idsToRemove;
  for (auto & p : renderAppliers) {
    int id = p.first;
    Applier & applier = p.second;
    if (applier.apply(rt, module)) {
      idsToRemove.push_back(id);
    }
  }

  for (auto id : idsToRemove) {
    unregisterApplierFromRender(id);
  }
}

void ApplierRegistry::event(Runtime &rt, std::string eventName) {
  //TODO
};



