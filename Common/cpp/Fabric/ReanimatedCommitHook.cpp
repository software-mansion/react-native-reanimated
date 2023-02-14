#include <react/renderer/core/ComponentDescriptor.h>

#include "ReanimatedCommitHook.h"

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

  return newRootShadowNode;
}

} // namespace reanimated
