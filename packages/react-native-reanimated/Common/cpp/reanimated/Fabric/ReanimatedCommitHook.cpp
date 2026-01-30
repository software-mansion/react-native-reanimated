#include <reanimated/Fabric/ReanimatedCommitHook.h>
#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <react/renderer/core/ComponentDescriptor.h>

#include <memory>
#include <unordered_map>
#include <vector>

using namespace facebook::react;

namespace reanimated {

ReanimatedCommitHook::ReanimatedCommitHook(
    const std::shared_ptr<UIManager> &uiManager,
    const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
    const std::shared_ptr<LayoutAnimationsProxyCommon> &layoutAnimationsProxy)
    : uiManager_(uiManager),
      updatesRegistryManager_(updatesRegistryManager),
      layoutAnimationsProxy_(layoutAnimationsProxy) {
  uiManager_->registerCommitHook(*this);
}

ReanimatedCommitHook::~ReanimatedCommitHook() noexcept {
  uiManager_->unregisterCommitHook(*this);
}

void ReanimatedCommitHook::maybeInitializeLayoutAnimations(SurfaceId surfaceId) {
  auto lock = std::unique_lock<std::mutex>(mutex_);
  if (surfaceId > currentMaxSurfaceId_) {
    // when a new surfaceId is observed we call setMountingOverrideDelegate
    // for all yet unseen surfaces
    uiManager_->getShadowTreeRegistry().enumerate([strongThis = shared_from_this()](
                                                      const ShadowTree &shadowTree, bool &stop) {
      // Executed synchronously.
      if (shadowTree.getSurfaceId() <= strongThis->currentMaxSurfaceId_) {
        // the set function actually adds our delegate to a list, so we
        // shouldn't invoke it twice for the same surface
        return;
      }
      // TODO: We should consider registering a new instance of proxy for each surface.
      // The current approach will encounter problems on platforms where it is more common to have multiple surfaces.
      strongThis->layoutAnimationsProxy_->startSurface(shadowTree.getSurfaceId());
      shadowTree.getMountingCoordinator()->setMountingOverrideDelegate(strongThis->layoutAnimationsProxy_);
    });
    currentMaxSurfaceId_ = surfaceId;
  }
}

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &,
    RootShadowNode::Shared const &,
    RootShadowNode::Unshared const &newRootShadowNode
#if REACT_NATIVE_MINOR_VERSION >= 80
    ,
    const ShadowTreeCommitOptions &commitOptions
#endif
    ) noexcept {
  ReanimatedSystraceSection s("ReanimatedCommitHook::shadowTreeWillCommit");

  maybeInitializeLayoutAnimations(newRootShadowNode->getSurfaceId());

  auto reaShadowNode = std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(newRootShadowNode);

  if (reaShadowNode->hasReanimatedCommitTrait()) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // the updates registry manager
    reaShadowNode->unsetReanimatedCommitTrait();
    reaShadowNode->setReanimatedMountTrait();
    return newRootShadowNode;
  }

#if REACT_NATIVE_MINOR_VERSION >= 80
  if constexpr (StaticFeatureFlags::getFlag("USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS")) {
    // State updates are based on the currently committed ShadowTree,
    // which means that all animation changes are already included.
    // Therefore, there's no need to reapply styles from the props map.
    if (commitOptions.source != ShadowTreeCommitSource::React) {
      return newRootShadowNode;
    }
  }
#endif

  // ShadowTree not commited by Reanimated, apply updates from the updates
  // registry manager
  reaShadowNode->unsetReanimatedMountTrait();
  RootShadowNode::Unshared rootNode = newRootShadowNode;

  {
    auto lock = updatesRegistryManager_->lock();

    PropsMap propsMap = updatesRegistryManager_->collectProps();
    updatesRegistryManager_->cancelCommitAfterPause();

    rootNode = cloneShadowTreeWithNewProps(*rootNode, propsMap);
    // If the commit comes from React Native then pause commits from
    // Reanimated since the ShadowTree to be committed by Reanimated may not
    // include the new changes from React Native yet and all changes of animated
    // props will be applied in ReanimatedCommitHook by UpdatesRegistryManager
    // This is very important, since if we didn't pause Reanimated commits,
    // it could lead to RN commits being delayed until the animation is finished
    // (very bad). We don't pause Reanimated commits for state updates coming
    // from React Native as this would break sticky header animations.
    updatesRegistryManager_->pauseReanimatedCommits();
  }

  return rootNode;
}

} // namespace reanimated
