#include <react/renderer/core/ComponentDescriptor.h>

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
    // PropsRegistry or recalculate layout
    return newRootShadowNode;
  }

  // ShadowTree not commited by Reanimated, apply updates from PropsRegistry and
  // recalculate layout

  auto surfaceId = newRootShadowNode->getSurfaceId();

  auto rootNode = newRootShadowNode->ShadowNode::clone(ShadowNodeFragment{});

  {
    ShadowTreeCloner shadowTreeCloner{uiManager_, surfaceId};

    {
      auto lock = propsRegistry_->createLock();

      propsRegistry_->for_each(
          [&](const ShadowNodeFamily &family, const folly::dynamic &props) {
            auto newRootNode = shadowTreeCloner.cloneWithNewProps(
                rootNode, family, RawProps(props));

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
  }

  auto finalRootShadowNode = std::static_pointer_cast<RootShadowNode>(rootNode);

  // trigger layout calculation here because commit hooks are executed after
  // React Native calls layoutIfNeeded
  finalRootShadowNode->layoutIfNeeded();

  // resolves "Incorrect set of mutations detected."
  finalRootShadowNode->sealRecursive();

  return finalRootShadowNode;
}

} // namespace reanimated
