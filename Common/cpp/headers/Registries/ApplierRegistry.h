//
// Created by Szymon Kapala on 2020-02-12.
//

#ifndef REANIMATEDEXAMPLE_APPLIERREGISTRY_H
#define REANIMATEDEXAMPLE_APPLIERREGISTRY_H

#include "SharedValue.h"
#include "Applier.h"
#include "MapperRegistry.h"
#include <map>
#include <unordered_map>

class ApplierRegistry {
    std::unordered_map<int, std::shared_ptr<Applier>> renderAppliers;
    std::map<std::string, std::unordered_map<int, std::shared_ptr<Applier>>> eventAppliers;
    std::map<int, std::string> eventMapping;
    std::shared_ptr<MapperRegistry> mapperRegistry;
  public:
    ApplierRegistry(std::shared_ptr<MapperRegistry> mapperRegistry);
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

    static int New_Applier_Id;
    std::unordered_map<int, std::shared_ptr<Applier>> getRenderAppliers() const;
    std::map<int, std::string> getEventMapping() const;
    std::shared_ptr<Applier> getRenderApplier(int id);
};

#endif //REANIMATEDEXAMPLE_APPLIERREGISTRY_H
