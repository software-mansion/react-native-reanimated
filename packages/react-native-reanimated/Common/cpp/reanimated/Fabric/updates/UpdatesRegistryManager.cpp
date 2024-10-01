#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

namespace reanimated {

PropsMap UpdatesRegistryManager::collectProps() {
  PropsMap propsMap;

  for (auto &registry : registries_) {
    registry->collectProps(propsMap);
  }

  return propsMap;
};

} // namespace reanimated
