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

  auto reaShadowNode = std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(newRootShadowNode);

  if (reaShadowNode->hasReanimatedCommitTrait()) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // the updates registry manager
    reaShadowNode->unsetReanimatedCommitTrait();
    reaShadowNode->setReanimatedMountTrait();
    return newRootShadowNode;
  }

  if constexpr (StaticFeatureFlags::getFlag("USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS")) {
    // State updates are based on the currently committed ShadowTree,
    // which means that all animation changes are already included.
    // Therefore, there's no need to reapply styles from the props map.
    if (commitOptions.source != ShadowTreeCommitSource::React) {
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
