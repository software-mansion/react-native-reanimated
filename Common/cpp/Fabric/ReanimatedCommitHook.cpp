#include <react/renderer/core/ComponentDescriptor.h>

#include "ReanimatedCommitHook.h"

using namespace facebook::react;

namespace reanimated {

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &shadowTree,
    RootShadowNode::Shared const &oldRootShadowNode,
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
  return newRootShadowNode;
}

} // namespace reanimated
