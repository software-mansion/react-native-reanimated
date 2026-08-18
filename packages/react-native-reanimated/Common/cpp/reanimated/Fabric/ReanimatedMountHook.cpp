#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ReanimatedMountHook.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <memory>

namespace reanimated {

ReanimatedMountHook::ReanimatedMountHook(
    const std::shared_ptr<UIManager> &uiManager,
    const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
    const std::shared_ptr<css::ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<ReanimatedSurfaceTracker> &surfaceTracker,
    const std::function<void()> &requestFlush)
    : uiManager_(uiManager),
      updatesRegistryManager_(updatesRegistryManager),
      viewStylesRepository_(viewStylesRepository),
      surfaceTracker_(surfaceTracker),
      requestFlush_(requestFlush) {
  uiManager_->registerMountHook(*this);
}

ReanimatedMountHook::~ReanimatedMountHook() noexcept {
  uiManager_->unregisterMountHook(*this);
}

void ReanimatedMountHook::shadowTreeDidMount(
    const RootShadowNode::Shared &rootShadowNode,
    HighResTimeStamp mountTime) noexcept {
  ReanimatedSystraceSection s("ReanimatedMountHook::shadowTreeDidMount");

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    // With the animation backend this hook only tracks surface unmounts.
    return;
  }

  auto reaShadowNode = std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
      std::const_pointer_cast<RootShadowNode>(rootShadowNode));

  // We mark reanimated commits with ReanimatedMountTrait. We don't want other
  // shadow nodes to use this trait, but since this rootShadowNode is Shared,
  // we don't have that guarantee. That's why we also unset this trait in the
  // commit hook. We remove it here mainly for the sake of cleanliness.
  const bool isReanimatedMount = reaShadowNode->hasReanimatedMountTrait();
  if (isReanimatedMount) {
    reaShadowNode->unsetReanimatedMountTrait();
  }

  {
    auto lock = updatesRegistryManager_->lock();
    // Record the mounted tree for relative-length resolution.
    viewStylesRepository_->setLastMountedRoot(rootShadowNode);

    // Always drain removable nodes, even on Reanimated's own commits. While CSS
    // animations run every mount carries the mount trait, so returning early here
    // would skip removals for the whole animation and leak unmounted nodes if the
    // tree is torn down mid-animation.
    updatesRegistryManager_->handleNodeRemovals(*rootShadowNode);

    if (!isReanimatedMount) {
      // When a commit from React Native has finished, we reset the skip commit
      // flag in order to allow Reanimated to commit its tree.
      updatesRegistryManager_->unpauseReanimatedCommits();
      if (updatesRegistryManager_->shouldCommitAfterPause()) {
        requestFlush_();
      }
    }
  }
}

void ReanimatedMountHook::shadowTreeDidUnmount(SurfaceId surfaceId, HighResTimeStamp /*unmountTime*/) noexcept {
  // Forget stopped surfaces so a reused surface id registers again.
  surfaceTracker_->remove(surfaceId);
}

} // namespace reanimated
