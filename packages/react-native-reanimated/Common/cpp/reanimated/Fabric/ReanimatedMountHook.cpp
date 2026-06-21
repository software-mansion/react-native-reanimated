#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ReanimatedMountHook.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <memory>

namespace reanimated {

ReanimatedMountHook::ReanimatedMountHook(
    const std::shared_ptr<UIManager> &uiManager,
    const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
    const std::shared_ptr<css::ViewStylesRepository> &viewStylesRepository,
    const std::function<void()> &requestFlush)
    : uiManager_(uiManager),
      updatesRegistryManager_(updatesRegistryManager),
      viewStylesRepository_(viewStylesRepository),
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

  auto reaShadowNode = std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
      std::const_pointer_cast<RootShadowNode>(rootShadowNode));

  const bool isReanimatedMount = reaShadowNode->hasReanimatedMountTrait();
  if (isReanimatedMount) {
    // We mark reanimated commits with ReanimatedMountTrait. We don't want other
    // shadow nodes to use this trait, but since this rootShadowNode is Shared,
    // we don't have that guarantee. That's why we also unset this trait in the
    // commit hook. We remove it here mainly for the sake of cleanliness.
    reaShadowNode->unsetReanimatedMountTrait();
  }

  {
    auto lock = updatesRegistryManager_->lock();
    // Record the freshly mounted (laid-out) tree under the updates-registry lock so
    // relative-length resolution can read layout from it without taking the ShadowTree
    // revision lock (the AB-BA deadlock with Fabric commits). This must run for every
    // mount, including Reanimated's own: during an animation those carry the latest
    // layout and are usually the only mounts there are.
    viewStylesRepository_->setLastMountedRoot(rootShadowNode);

    if (isReanimatedMount) {
      return;
    }

    updatesRegistryManager_->handleNodeRemovals(*rootShadowNode);

    // When commit from React Native has finished, we reset the skip commit flag
    // in order to allow Reanimated to commit its tree
    updatesRegistryManager_->unpauseReanimatedCommits();
    if (updatesRegistryManager_->shouldCommitAfterPause()) {
      requestFlush_();
    }
  }
}

} // namespace reanimated
