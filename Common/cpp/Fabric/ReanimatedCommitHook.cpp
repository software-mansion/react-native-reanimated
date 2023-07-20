#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/ComponentDescriptor.h>

#include "ReanimatedCommitHook.h"
#include "ShadowTreeCloner.h"

using namespace facebook::react;

namespace reanimated {

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &,
    RootShadowNode::Shared const &,
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
  if (propsRegistry_->isLastReanimatedRoot(newRootShadowNode)) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // PropsRegistry
    return newRootShadowNode;
  }

  // ShadowTree not commited by Reanimated, apply updates from PropsRegistry

  auto surfaceId = newRootShadowNode->getSurfaceId();

  auto rootNode = newRootShadowNode->ShadowNode::clone(ShadowNodeFragment{});

  ShadowTreeCloner shadowTreeCloner{uiManager_, surfaceId};

  {
    auto lock = propsRegistry_->createLock();

    propsRegistry_->for_each([&](const ShadowNodeFamily &family,
                                 const folly::dynamic &props) {
      auto newRootNode =
          shadowTreeCloner.cloneWithNewProps(rootNode, family, RawProps(props));

      if (newRootNode == nullptr) {
        // this happens when React removed the component but Reanimated
        // still tries to animate it, let's skip update for this specific
        // component
        return;
      }
      rootNode = newRootNode;
    });
  }

  // request Reanimated to skip one commit so that React Native can mount the
  // changes instead of failing 1024 times and crashing the app
  propsRegistry_->pleaseSkipCommit();

  return std::static_pointer_cast<RootShadowNode>(rootNode);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
