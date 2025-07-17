#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ReanimatedMountHook.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

namespace reanimated {

ReanimatedMountHook::ReanimatedMountHook(
    const std::shared_ptr<UIManager> &uiManager,
    const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager,
    const std::function<void()> &requestFlush)
    : uiManager_(uiManager),
      updatesRegistryManager_(updatesRegistryManager),
      requestFlush_(requestFlush) {
  uiManager_->registerMountHook(*this);
}

ReanimatedMountHook::~ReanimatedMountHook() noexcept {
  uiManager_->unregisterMountHook(*this);
}

void ReanimatedMountHook::shadowTreeDidMount(
    const RootShadowNode::Shared &rootShadowNode,
#if REACT_NATIVE_MINOR_VERSION >= 81
    HighResTimeStamp
#else
    double
#endif // REACT_NATIVE_MINOR_VERSION >= 81
    ) noexcept {
  ReanimatedSystraceSection s("ReanimatedMountHook::shadowTreeDidMount");

  auto reaShadowNode =
      std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
          std::const_pointer_cast<RootShadowNode>(rootShadowNode));

  if (reaShadowNode->hasReanimatedMountTrait()) {
    // We mark reanimated commits with ReanimatedMountTrait. We don't want other
    // shadow nodes to use this trait, but since this rootShadowNode is Shared,
    // we don't have that guarantee. That's why we also unset this trait in the
    // commit hook. We remove it here mainly for the sake of cleanliness.
    reaShadowNode->unsetReanimatedMountTrait();
    return;
  }

  {
    auto lock = updatesRegistryManager_->lock();
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
