#include <reanimated/Fabric/MountedRootsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <react/debug/react_native_assert.h>

namespace reanimated {

void MountedRootsRegistry::set(const RootShadowNode::Shared &rootShadowNode) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  rootsBySurface_[rootShadowNode->getSurfaceId()] = rootShadowNode;
}

void MountedRootsRegistry::remove(const SurfaceId surfaceId) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  rootsBySurface_.erase(surfaceId);
}

RootShadowNode::Shared MountedRootsRegistry::get(const SurfaceId surfaceId) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto it = rootsBySurface_.find(surfaceId);
  return it == rootsBySurface_.end() ? nullptr : it->second;
}

bool MountedRootsRegistry::isMounted(const ShadowNodeFamily &shadowNodeFamily) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto it = rootsBySurface_.find(shadowNodeFamily.getSurfaceId());
  return it != rootsBySurface_.end() && !shadowNodeFamily.getAncestors(*it->second).empty();
}

} // namespace reanimated
