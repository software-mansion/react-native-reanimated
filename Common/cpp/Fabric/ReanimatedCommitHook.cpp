#ifdef RCT_NEW_ARCH_ENABLED

#include "ReanimatedCommitHook.h"
#include <react/renderer/mounting/Differentiator.h>

#include <vector>

using namespace facebook::react;

namespace reanimated {

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &shadowTree,
    RootShadowNode::Shared const &oldRootShadowNode,
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
  auto mutations =
      calculateShadowViewMutations(*oldRootShadowNode, *newRootShadowNode);

  std::vector<Tag> tagsOfCreatedViews;
  std::vector<Tag> tagsOfUpdatedViews;

  for (const auto &mutation : mutations) {
    switch (mutation.type) {
      case ShadowViewMutation::Create:
        tagsOfCreatedViews.push_back(mutation.newChildShadowView.tag);
        break;

      case ShadowViewMutation::Update:
        assert(
            mutation.oldChildShadowView.tag == mutation.newChildShadowView.tag);
        tagsOfUpdatedViews.push_back(mutation.newChildShadowView.tag);
        break;

      default:
        // TODO: handle other cases
        break;
    }
  }

  // TODO: schedule on UI
  layoutAnimationsProxy_->tagsOfCreatedViews_ = tagsOfCreatedViews;
  layoutAnimationsProxy_->tagsOfUpdatedViews_ = tagsOfUpdatedViews;

  return newRootShadowNode;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
