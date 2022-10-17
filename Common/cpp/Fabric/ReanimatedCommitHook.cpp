#ifdef RCT_NEW_ARCH_ENABLED

#include "ReanimatedCommitHook.h"

#include <react/renderer/mounting/Differentiator.h>

#include <set>

using namespace facebook::react;

namespace reanimated {

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &shadowTree,
    RootShadowNode::Shared const &oldRootShadowNode,
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
  // TODO: implement custom diffing to find only the roots of changed subtrees

  auto mutations =
      calculateShadowViewMutations(*oldRootShadowNode, *newRootShadowNode);

  std::set<Tag> tagsOfCreatedViews;
  std::set<Tag> tagsOfUpdatedViews;
  std::set<Tag> tagsOfRemovedViews;

  for (const auto &mutation : mutations) {
    switch (mutation.type) {
      case ShadowViewMutation::Create:
        tagsOfCreatedViews.insert(mutation.newChildShadowView.tag);
        break;

      case ShadowViewMutation::Update:
        assert(
            mutation.oldChildShadowView.tag == mutation.newChildShadowView.tag);
        tagsOfUpdatedViews.insert(mutation.newChildShadowView.tag);
        break;

      case ShadowViewMutation::Remove:
        tagsOfRemovedViews.insert(mutation.oldChildShadowView.tag);
        break;

      default:
        // TODO: handle RemoveTree
        break;
    }
  }

  // TODO: this is a hack just to check if layout animation works for
  // <Animated.View> with <Text> inside
  while (tagsOfUpdatedViews.size() > 1) {
    tagsOfUpdatedViews.erase(tagsOfUpdatedViews.begin());
  }

  // TODO: schedule on UI
  layoutAnimationsProxy_->tagsOfCreatedViews_ = tagsOfCreatedViews;
  layoutAnimationsProxy_->tagsOfUpdatedViews_ = tagsOfUpdatedViews;
  layoutAnimationsProxy_->tagsOfRemovedViews_ = tagsOfRemovedViews;

  return newRootShadowNode;
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
