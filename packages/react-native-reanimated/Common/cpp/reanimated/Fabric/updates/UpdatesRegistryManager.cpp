#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

namespace reanimated {

PropsMap UpdatesRegistryManager::collectProps() {
  PropsMap propsMap;

  for (auto &registry : registries_) {
    registry->collectProps(propsMap);
  }

  return propsMap;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
