#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ReanimatedMountHook.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <memory>

namespace reanimated {

ReanimatedMountHook::ReanimatedMountHook(
    const std::shared_ptr<UIManager> &uiManager,
    const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
    const std::shared_ptr<MountedRootsRegistry> &mountedRootsRegistry,
    const std::shared_ptr<LayoutAnimationsProxyRegistry> &layoutAnimationsProxyRegistry,
    const std::shared_ptr<SynchronousWritesTracker> &synchronousWritesTracker,
    const std::function<void()> &requestFlush)
    : uiManager_(uiManager),
      updatesRegistryManager_(updatesRegistryManager),
      mountedRootsRegistry_(mountedRootsRegistry),
      layoutAnimationsProxyRegistry_(layoutAnimationsProxyRegistry),
      synchronousWritesTracker_(synchronousWritesTracker),
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

  if (synchronousWritesTracker_) {
    synchronousWritesTracker_->onMountReport(rootShadowNode);
  }

  auto reaShadowNode = std::reinterpret_pointer_cast<const ReanimatedCommitShadowNode>(rootShadowNode);

  const bool isReanimatedMount = reaShadowNode->hasReanimatedMountTrait();

  {
    auto lock = updatesRegistryManager_->lock();
    mountedRootsRegistry_->set(rootShadowNode);

    // Always drain removable nodes, even on Reanimated's own commits. While CSS
    // animations run every mount carries the mount trait, so returning early here
    // would skip removals for the whole animation and leak unmounted nodes if the
    // tree is torn down mid-animation.
    updatesRegistryManager_->handleNodeRemovals();

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
  if (layoutAnimationsProxyRegistry_) {
    layoutAnimationsProxyRegistry_->remove(surfaceId);
  }
  if (synchronousWritesTracker_) {
    synchronousWritesTracker_->onSurfaceStop(surfaceId);
  }

  auto lock = updatesRegistryManager_->lock();
  mountedRootsRegistry_->remove(surfaceId);
}

} // namespace reanimated
