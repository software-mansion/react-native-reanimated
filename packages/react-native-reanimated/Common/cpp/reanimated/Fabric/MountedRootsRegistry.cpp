#include <reanimated/Fabric/MountedRootsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <reanimated/Compat/ReactNativeDebug.h>
#include <reanimated/Compat/ReactNativeRendererCore.h>

namespace reanimated {

namespace {

bool hasDisplayNone(const ShadowNode &shadowNode) {
  // `display: none` sets the Hidden trait when the props are committed. The layout metrics
  // cover components that do not set the trait.
  if (shadowNode.getTraits().check(ShadowNodeTraits::Trait::Hidden)) {
    return true;
  }
  const auto *layoutableShadowNode = dynamic_cast<const LayoutableShadowNode *>(&shadowNode);
  return layoutableShadowNode && layoutableShadowNode->getLayoutMetrics().displayType == DisplayType::None;
}

} // namespace

void MountedRootsRegistry::registerSurface(const SurfaceId surfaceId) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  rootsBySurface_.try_emplace(surfaceId, nullptr);
}

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

bool MountedRootsRegistry::isRunning(const SurfaceId surfaceId) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  return rootsBySurface_.contains(surfaceId);
}

bool MountedRootsRegistry::isMounted(const ShadowNodeFamily &shadowNodeFamily) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto it = rootsBySurface_.find(shadowNodeFamily.getSurfaceId());
  return it != rootsBySurface_.end() && (!it->second || !shadowNodeFamily.getAncestors(*it->second).empty());
}

bool MountedRootsRegistry::isHidden(const ShadowNodeFamily &shadowNodeFamily, const bool includeSelf) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto root = get(shadowNodeFamily.getSurfaceId());
  if (!root) {
    return false;
  }

  const auto ancestors = shadowNodeFamily.getAncestors(*root);
  if (ancestors.empty()) {
    // Not mounted (yet), so there is nothing to tell.
    return false;
  }

  for (const auto &[parent, _] : ancestors) {
    if (hasDisplayNone(parent.get())) {
      return true;
    }
  }

  if (!includeSelf) {
    return false;
  }
  const auto &[parent, childIndex] = ancestors.back();
  return hasDisplayNone(*parent.get().getChildren().at(childIndex));
}

} // namespace reanimated
