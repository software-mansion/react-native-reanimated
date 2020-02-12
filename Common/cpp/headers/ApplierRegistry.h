//
// Created by Szymon Kapala on 2020-02-12.
//

#ifndef REANIMATEDEXAMPLE_APPLIERREGISTRY_H
#define REANIMATEDEXAMPLE_APPLIERREGISTRY_H

class ApplierRegistry {
  std::unordered_map<int, std::shared_ptr<Applier>> renderAppliers;
  std::map<std::string, std::unordered_map<int, Applier>> eventAppliers;
  std::map<int, std::string> eventMapping;
  public:
    void registerApplierForRender(int id, std::shared_ptr<Applier> applier);
    void unregisterApplierFromRender(int id);
    void registerApplierForEvent(int id, std::string eventName, std::shared_ptr<Applier> applier);
    void unregisterApplierFromEvent(int id);
    void render(Runtime &rt);
    void event(Runtime &rt, std::string eventName);
};

#endif //REANIMATEDEXAMPLE_APPLIERREGISTRY_H
