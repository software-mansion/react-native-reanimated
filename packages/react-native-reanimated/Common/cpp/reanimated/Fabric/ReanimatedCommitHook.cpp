#include <reanimated/Fabric/ReanimatedCommitHook.h>
#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Fabric/updates/SynchronousProps.h>
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
    const std::shared_ptr<LayoutAnimationsProxyRegistry> &layoutAnimationsProxyRegistry)
    : uiManager_(uiManager),
      updatesRegistryManager_(updatesRegistryManager),
      layoutAnimationsProxyRegistry_(layoutAnimationsProxyRegistry) {
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
    RootShadowNode::Shared const &oldRootShadowNode,
    RootShadowNode::Unshared const &newRootShadowNode,
    const ShadowTreeCommitOptions &commitOptions) noexcept {
  ReanimatedSystraceSection s("ReanimatedCommitHook::shadowTreeWillCommit");

  if (const auto proxy = registerLayoutAnimations(shadowTree)) {
    proxy->shadowTreeWillCommit(newRootShadowNode->getChildren().empty());
  }

  if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
    return newRootShadowNode;
  }

  if constexpr (synchronousUpdatesEnabled()) {
    // A React branch can contain props that have not reached the main tree.
    if (commitOptions.source != ShadowTreeCommitSource::React) {
      auto lock = updatesRegistryManager_->lock();
      updatesRegistryManager_->acknowledgeReactCommit(*oldRootShadowNode);
    }
  }

  auto reaShadowNode = std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(newRootShadowNode);

  if (reaShadowNode->hasReanimatedCommitTrait()) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // the updates registry manager
    reaShadowNode->unsetReanimatedCommitTrait();
    reaShadowNode->setReanimatedMountTrait();
    return newRootShadowNode;
  }

  if constexpr (StaticFeatureFlags::getFlag("USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS")) {
    // Non-React commits clone from trees that never received the synchronous
    // values, so the pending values ride along here. No commit pausing for
    // these sources - that breaks sticky header animations.
    const bool isReactCommit = commitOptions.source == ShadowTreeCommitSource::React ||
        (synchronousUpdatesEnabled() && commitOptions.source == ShadowTreeCommitSource::ReactRevisionMerge);
    if (!isReactCommit) {
      if constexpr (synchronousUpdatesEnabled()) {
        auto lock = updatesRegistryManager_->lock();
        const auto surfaceId = shadowTree.getSurfaceId();
        const auto version = updatesRegistryManager_->pendingSynchronousPropsVersion(surfaceId);
        const auto carriedIt = pendingCarriedRoots_.find(surfaceId);
        if (carriedIt != pendingCarriedRoots_.end() && carriedIt->second.first == version &&
            carriedIt->second.second.lock() == oldRootShadowNode) {
          // The base already carries these values - its clones keep the props
          // pointers. The new root becomes the next carrier.
          carriedIt->second.second = std::weak_ptr<const RootShadowNode>(newRootShadowNode);
          return newRootShadowNode;
        }
        PropsMap pendingProps;
        updatesRegistryManager_->collectPendingSynchronousProps(pendingProps, surfaceId);
        if (!pendingProps.empty()) {
          RootShadowNode::Unshared decoratedRootNode = cloneShadowTreeWithNewProps(*newRootShadowNode, pendingProps);
          pendingCarriedRoots_[surfaceId] = {version, std::weak_ptr<const RootShadowNode>(decoratedRootNode)};
          return decoratedRootNode;
        }
        pendingCarriedRoots_.erase(surfaceId);
      }
      return newRootShadowNode;
    }
  }

  // ShadowTree not commited by Reanimated, apply updates from the updates
  // registry manager
  reaShadowNode->unsetReanimatedMountTrait();
  RootShadowNode::Unshared rootNode = newRootShadowNode;

  {
    auto lock = updatesRegistryManager_->lock();

    PropsMap propsMap = updatesRegistryManager_->collectProps();
    rootNode = cloneShadowTreeWithNewProps(*rootNode, propsMap);
    bool carriesAllPendingProps = true;
    if constexpr (synchronousUpdatesEnabled()) {
      carriesAllPendingProps = updatesRegistryManager_->recordReactCommit(rootNode, propsMap);
    }
    if (carriesAllPendingProps) {
      updatesRegistryManager_->cancelCommitAfterPause();
    }
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
