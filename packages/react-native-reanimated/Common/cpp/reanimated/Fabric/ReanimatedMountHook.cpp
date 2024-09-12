#if defined(RCT_NEW_ARCH_ENABLED) && REACT_NATIVE_MINOR_VERSION >= 73

#include "ReanimatedMountHook.h"
#include "ReanimatedCommitShadowNode.h"

namespace reanimated {

ReanimatedMountHook::ReanimatedMountHook(
    const std::shared_ptr<PropsRegistry> &propsRegistry,
    const std::shared_ptr<UIManager> &uiManager)
    : propsRegistry_(propsRegistry), uiManager_(uiManager) {
  uiManager_->registerMountHook(*this);
}

ReanimatedMountHook::~ReanimatedMountHook() noexcept {
  uiManager_->unregisterMountHook(*this);
}

void ReanimatedMountHook::shadowTreeDidMount(
    RootShadowNode::Shared const &rootShadowNode,
    double) noexcept {
  auto reaShadowNode =
      std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
          std::const_pointer_cast<RootShadowNode>(rootShadowNode));

  if (reaShadowNode->hasReanimatedMountTrait()) {
    reaShadowNode->unsetReanimatedMountTrait();
  } else {
    // When commit from React Native has finished, we reset the skip commit flag
    // in order to allow Reanimated to commit its tree
    propsRegistry_->unpauseReanimatedCommits();
    if (propsRegistry_->shouldFlush()) {
      const auto &shadowTreeRegistry = uiManager_->getShadowTreeRegistry();

      shadowTreeRegistry.visit(
          rootShadowNode->getSurfaceId(), [&](ShadowTree const &shadowTree) {
            shadowTree.commit(
                [&](RootShadowNode const &oldRootShadowNode)
                    -> RootShadowNode::Unshared {
                  PropsMap propsMap;

                  RootShadowNode::Unshared rootNode =
                      std::static_pointer_cast<RootShadowNode>(
                          oldRootShadowNode.ShadowNode::clone({}));
                  {
                    auto lock = propsRegistry_->createLock();

                    propsRegistry_->for_each([&](const ShadowNodeFamily &family,
                                                 const folly::dynamic &props) {
                      propsMap[&family].emplace_back(props);
                    });

                    rootNode = cloneShadowTreeWithNewProps(
                        oldRootShadowNode, propsMap);
                  }

                  // Mark the commit as Reanimated commit so that we can
                  // distinguish it in ReanimatedCommitHook.
                  auto reaShadowNode =
                      std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
                          rootNode);
                  reaShadowNode->setReanimatedCommitTrait();

                  return rootNode;
                },
                {/* .enableStateReconciliation = */
                 false,
                 /* .mountSynchronously = */ true});
          });
    }
  }
}

} // namespace reanimated

#endif // defined(RCT_NEW_ARCH_ENABLED) && REACT_NATIVE_MINOR_VERSION >= 73
