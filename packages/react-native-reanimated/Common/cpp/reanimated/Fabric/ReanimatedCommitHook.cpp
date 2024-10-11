#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/ReanimatedCommitHook.h>
#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <react/renderer/core/ComponentDescriptor.h>

#include <unordered_map>
#include <vector>

using namespace facebook::react;

namespace reanimated {

ReanimatedCommitHook::ReanimatedCommitHook(
    const std::shared_ptr<PropsRegistry> &propsRegistry,
    const std::shared_ptr<UIManager> &uiManager,
    const std::shared_ptr<LayoutAnimationsProxy> &layoutAnimationsProxy)
    : propsRegistry_(propsRegistry),
      uiManager_(uiManager),
      layoutAnimationsProxy_(layoutAnimationsProxy) {
  uiManager_->registerCommitHook(*this);
}

ReanimatedCommitHook::~ReanimatedCommitHook() noexcept {
  uiManager_->unregisterCommitHook(*this);
}

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &,
    RootShadowNode::Shared const &,
    RootShadowNode::Unshared const &newRootShadowNode) noexcept {
  auto surfaceId = newRootShadowNode->getSurfaceId();

  {
    auto lock = std::unique_lock<std::mutex>(mutex_);
    if (surfaceId > currentMaxSurfaceId_) {
      uiManager_->getShadowTreeRegistry().enumerate(
          [this](const ShadowTree &shadowTree, bool &stop) {
            shadowTree.getMountingCoordinator()->setMountingOverrideDelegate(
                layoutAnimationsProxy_);
          });
      currentMaxSurfaceId_ = surfaceId;
    }
  }

  auto reaShadowNode =
      std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
          newRootShadowNode);

  if (reaShadowNode->hasReanimatedCommitTrait()) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // PropsRegistry
    reaShadowNode->unsetReanimatedCommitTrait();
    reaShadowNode->setReanimatedMountTrait();
    return newRootShadowNode;
  }

  // ShadowTree not commited by Reanimated, apply updates from PropsRegistry
  reaShadowNode->unsetReanimatedMountTrait();
  RootShadowNode::Unshared rootNode = newRootShadowNode;
  PropsMap propsMap;

  {
    auto lock = propsRegistry_->createLock();

    propsRegistry_->for_each(
        [&](const ShadowNodeFamily &family, const folly::dynamic &props) {
          propsMap[&family].emplace_back(props);
        });

    rootNode = cloneShadowTreeWithNewProps(*rootNode, propsMap);

    // If the commit comes from React Native then pause commits from
    // Reanimated since the ShadowTree to be committed by Reanimated may not
    // include the new changes from React Native yet and all changes of animated
    // props will be applied in ReanimatedCommitHook by iterating over
    // PropsRegistry.
    // This is very important, since if we didn't pause Reanimated commits,
    // it could lead to RN commits being delayed until the animation is finished
    // (very bad).
    propsRegistry_->pauseReanimatedCommits();
  }

  return rootNode;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
