#include <react/renderer/core/ComponentDescriptor.h>

#include <iostream>
#include <set>

#include "FabricUtils.h"
#include "ReanimatedCommitHook.h"
#include "ShadowTreeCloner.h"

using namespace facebook::react;

namespace reanimated {

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &shadowTree,
    RootShadowNode::Shared const &oldRootShadowNode,
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
  if (propsRegistry_->isLastReanimatedRoot(newRootShadowNode)) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // PropsRegistry or re-calculate layout
    std::cout << "ReanimatedCommitHook: skipped" << std::endl;
    return newRootShadowNode;
  }

  auto surfaceId = newRootShadowNode->getSurfaceId();

  ShadowTreeCloner shadowTreeCloner{propsRegistry_, uiManager_, surfaceId};

  auto rootNode = newRootShadowNode->ShadowNode::clone(ShadowNodeFragment{});

  {
    auto lock = propsRegistry_->createLock();

    static int i = 0;
    std::cout << "[" << i++
              << "] ReanimatedCommitHook: " << propsRegistry_->size()
              << " changes" << std::endl;

    propsRegistry_->for_each(
        [&](ShadowNodeFamily const &family, const folly::dynamic &dynProps) {
          auto newRootNode = shadowTreeCloner.cloneWithNewProps(
              rootNode, family, RawProps(dynProps));

          if (newRootNode == nullptr) {
            // this happens when React removed the component but Reanimated
            // still tries to animate it, let's skip update for this specific
            // component
            return;
          }
          rootNode = newRootNode;
        });
  }

  shadowTreeCloner.updateYogaChildren();

  auto newRootShadowNode2 = std::static_pointer_cast<RootShadowNode>(rootNode);

  // trigger layout here (commit hooks are executed after RN calls
  // layoutIfNeeded!)
  newRootShadowNode2->layoutIfNeeded();

  return newRootShadowNode2;
}

} // namespace reanimated
