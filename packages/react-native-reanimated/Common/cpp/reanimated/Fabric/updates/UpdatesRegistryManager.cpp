#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

namespace reanimated {

UpdatesBatch UpdatesRegistryManager::flushUpdates(jsi::Runtime &rt) {
  UpdatesBatch updatesBatch;

  for (auto &registry : registries_) {
    registry->flushUpdates(rt, updatesBatch);
  }

  return updatesBatch;
};

PropsMap UpdatesRegistryManager::collectProps() {
  PropsMap propsMap;

  for (auto &registry : registries_) {
    registry->collectProps(propsMap);
  }

  return propsMap;
};

} // namespace reanimated
