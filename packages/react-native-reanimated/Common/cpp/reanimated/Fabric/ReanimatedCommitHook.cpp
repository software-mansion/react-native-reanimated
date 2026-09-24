#include <reanimated/Fabric/ReanimatedCommitHook.h>
#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <memory>
#include <unordered_map>
#include <vector>

using namespace facebook::react;

namespace reanimated {

ReanimatedCommitHook::ReanimatedCommitHook(
    const std::shared_ptr<UIManager> &uiManager,
    const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
    const std::shared_ptr<css::ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<LayoutAnimationsProxyRegistry> &layoutAnimationsProxyRegistry,
    const std::shared_ptr<SynchronousWritesTracker> &synchronousWritesTracker)
    : uiManager_(uiManager),
      updatesRegistryManager_(updatesRegistryManager),
      viewStylesRepository_(viewStylesRepository),
      layoutAnimationsProxyRegistry_(layoutAnimationsProxyRegistry),
      synchronousWritesTracker_(synchronousWritesTracker) {
  uiManager_->registerCommitHook(*this);
  uiManager_->getShadowTreeRegistry().enumerate(
      [this](const ShadowTree &shadowTree, bool & /*stop*/) { registerLayoutAnimations(shadowTree); });
}

ReanimatedCommitHook::~ReanimatedCommitHook() noexcept {
  uiManager_->unregisterCommitHook(*this);
}

std::shared_ptr<LayoutAnimationsProxyCommon> ReanimatedCommitHook::registerLayoutAnimations(
    const ShadowTree &shadowTree) {
  if (!layoutAnimationsProxyRegistry_) {
    return nullptr;
  }
  return layoutAnimationsProxyRegistry_->registerSurface(shadowTree);
}

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &shadowTree,
    RootShadowNode::Shared const &,
    RootShadowNode::Unshared const &newRootShadowNode,
    const ShadowTreeCommitOptions &commitOptions) noexcept {
  ReanimatedSystraceSection s("ReanimatedCommitHook::shadowTreeWillCommit");

  if (const auto proxy = registerLayoutAnimations(shadowTree)) {
    proxy->shadowTreeWillCommit(newRootShadowNode->getChildren().empty());
  }

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    return newRootShadowNode;
  }

  if (newRootShadowNode->getChildren().empty()) {
    // A stopping surface commits an empty root; its mount is not reported on a paused Android host.
    auto lock = updatesRegistryManager_->lock();
    viewStylesRepository_->removeSurface(shadowTree.getSurfaceId());
    if (synchronousWritesTracker_) {
      synchronousWritesTracker_->onSurfaceStop(shadowTree.getSurfaceId());
    }
  }

  auto reaShadowNode = std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(newRootShadowNode);

  if (reaShadowNode->hasReanimatedCommitTrait()) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // the updates registry manager
    reaShadowNode->unsetReanimatedCommitTrait();
    reaShadowNode->setReanimatedMountTrait();
    trackCommit(newRootShadowNode, false);
    return newRootShadowNode;
  }

  if constexpr (StaticFeatureFlags::getFlag("USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS")) {
    // State updates are based on the currently committed ShadowTree,
    // which means that all animation changes are already included.
    // Therefore, there's no need to reapply styles from the props map.
    if (commitOptions.source != ShadowTreeCommitSource::React) {
      trackCommit(newRootShadowNode, false);
      return newRootShadowNode;
    }
  }

  // ShadowTree not commited by Reanimated, apply updates from the updates
  // registry manager
  reaShadowNode->unsetReanimatedMountTrait();
  // The UI thread takes the registry lock on each frame, so the clone runs outside it. Without the commit pause,
  // Reanimated commits can then start during the clone, and React starts its commit again more often.
  constexpr bool cloneInsideRegistryLock = StaticFeatureFlags::getFlag("DISABLE_COMMIT_PAUSING_MECHANISM");
  RootShadowNode::Unshared rootNode = newRootShadowNode;
  PropsMap propsMap;

  {
    auto lock = updatesRegistryManager_->lock();

    propsMap = updatesRegistryManager_->collectProps();
    updatesRegistryManager_->cancelCommitAfterPause();

    // Must share the registry lock with `collectProps`, or a write can get the epoch of a snapshot that lacks it.
    trackWillCommit(rootNode, true);
    // If the commit comes from React Native then pause commits from
    // Reanimated since the ShadowTree to be committed by Reanimated may not
    // include the new changes from React Native yet and all changes of animated
    // props will be applied in ReanimatedCommitHook by UpdatesRegistryManager
    // This is very important, since if we didn't pause Reanimated commits,
    // it could lead to RN commits being delayed until the animation is finished
    // (very bad). We don't pause Reanimated commits for state updates coming
    // from React Native as this would break sticky header animations.
    updatesRegistryManager_->pauseReanimatedCommits();

    if constexpr (cloneInsideRegistryLock) {
      rootNode = cloneShadowTreeWithNewProps(*rootNode, propsMap);
    }
  }

  if constexpr (!cloneInsideRegistryLock) {
    rootNode = cloneShadowTreeWithNewProps(*rootNode, propsMap);
  }
  trackDidCommit(rootNode);
  return rootNode;
}

#if REACT_NATIVE_VERSION_MINOR >= 88
void ReanimatedCommitHook::shadowTreeDidCommit(
    const ShadowTree &,
    const RootShadowNode::Shared &rootShadowNode,
    const std::vector<const LayoutableShadowNode *> &) noexcept {
  if (synchronousWritesTracker_) {
    synchronousWritesTracker_->onDidCommit(rootShadowNode);
  }
}
#endif

void ReanimatedCommitHook::trackCommit(const RootShadowNode::Shared &rootShadowNode, const bool carriesRegistryValues)
    const {
  trackWillCommit(rootShadowNode, carriesRegistryValues);
  trackDidCommit(rootShadowNode);
}

void ReanimatedCommitHook::trackWillCommit(
    const RootShadowNode::Shared &rootShadowNode,
    const bool carriesRegistryValues) const {
  if (synchronousWritesTracker_) {
    synchronousWritesTracker_->onWillCommit(rootShadowNode, carriesRegistryValues);
  }
}

void ReanimatedCommitHook::trackDidCommit([[maybe_unused]] const RootShadowNode::Shared &rootShadowNode) const {
#if REACT_NATIVE_VERSION_MINOR < 88
  // Before 0.88 there is no `shadowTreeDidCommit`. The root that this hook returns is the only one available.
  if (synchronousWritesTracker_) {
    synchronousWritesTracker_->onDidCommit(rootShadowNode);
  }
#endif
}

} // namespace reanimated
