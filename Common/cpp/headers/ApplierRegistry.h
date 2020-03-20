//
// Created by Szymon Kapala on 2020-02-12.
//

#ifndef REANIMATEDEXAMPLE_APPLIERREGISTRY_H
#define REANIMATEDEXAMPLE_APPLIERREGISTRY_H

#include "SharedValue.h"
#include "Applier.h"
#include <map>
#include <unordered_map>

class ApplierRegistry {
    std::unordered_map<int, std::shared_ptr<Applier>> renderAppliers;
    std::map<std::string, std::unordered_map<int, std::shared_ptr<Applier>>> eventAppliers;
    std::map<int, std::string> eventMapping;
  public:
    void registerApplierForRender(int id, std::shared_ptr<Applier> applier);
    void unregisterApplierFromRender(int id);
    void registerApplierForEvent(int id, std::string eventName, std::shared_ptr<Applier> applier);
    void unregisterApplierFromEvent(int id);
    void evaluateAppliers(jsi::Runtime &rt,
                          std::shared_ptr<BaseWorkletModule> module,
                          std::unordered_map<int, std::shared_ptr<Applier>> appliers,
                          std::function<void(int)> unregisterApplier);
    void render(jsi::Runtime &rt, std::shared_ptr<BaseWorkletModule> module);
    void event(jsi::Runtime &rt, std::string eventName, std::shared_ptr<BaseWorkletModule> module);
    bool anyApplierRegisteredForEvent(std::string eventName);
    bool notEmpty();

    std::unordered_map<int, std::shared_ptr<Applier>> getRenderAppliers() const;
    std::map<int, std::string> getEventMapping() const;
};

#endif //REANIMATEDEXAMPLE_APPLIERREGISTRY_H
