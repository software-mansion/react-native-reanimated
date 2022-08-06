#include <react/renderer/core/ComponentDescriptor.h>

#include <chrono>
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
    // std::cout << "[ReanimatedCommitHook] lastReanimatedRoot is " <<
    // &*newRootShadowNode << ", skipping" << std::endl;
    return newRootShadowNode;
  }

  auto surfaceId = newRootShadowNode->getSurfaceId();

  ShadowTreeCloner shadowTreeCloner{propsRegistry_, uiManager_, surfaceId};

  auto rootNode = newRootShadowNode->ShadowNode::clone(ShadowNodeFragment{});

  // rootNode->sealRecursive();

  {
    auto lock = propsRegistry_->createLock();

    auto start = std::chrono::high_resolution_clock::now();

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

    auto end = std::chrono::high_resolution_clock::now();
    auto duration =
        std::chrono::duration_cast<std::chrono::microseconds>(end - start);

    static int i = 0;
    std::cout << "[ReanimatedCommitHook] lastReanimatedRoot is "
              << &*newRootShadowNode << ", i=" << i++
              << ", size=" << propsRegistry_->size()
              << ", time=" << duration.count() << "us" << std::endl;
  }

  shadowTreeCloner.updateYogaChildren();

  auto newRootShadowNode2 = std::static_pointer_cast<RootShadowNode>(rootNode);

  // trigger layout here (commit hooks are executed after RN calls
  // layoutIfNeeded!)
  newRootShadowNode2->layoutIfNeeded();

  return newRootShadowNode2;
}

} // namespace reanimated
