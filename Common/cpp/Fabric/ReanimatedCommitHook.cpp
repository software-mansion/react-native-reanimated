#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/ComponentDescriptor.h>

#include "ReanimatedCommitHook.h"
#include "ReanimatedCommitMarker.h"
#include "ShadowTreeCloner.h"

using namespace facebook::react;

namespace reanimated {

ReanimatedCommitHook::ReanimatedCommitHook(
    const std::shared_ptr<PropsRegistry> &propsRegistry,
    const std::shared_ptr<UIManager> &uiManager,
    std::shared_ptr<LayoutAnimationsProxy> lap)
    : propsRegistry_(propsRegistry), uiManager_(uiManager), lap_(lap) {
  uiManager_->registerCommitHook(*this);
}

ReanimatedCommitHook::~ReanimatedCommitHook() noexcept {
  uiManager_->unregisterCommitHook(*this);
}

ShadowNode::Shared findChild(ShadowNode::Shared root, Tag tag){
  if (root->getTag() == tag){
    return root;
  }
  for (ShadowNode::Shared child: root->getChildren()){
    auto res = findChild(child, tag);
    if (res != nullptr){
      return res;
    }
  }
  return nullptr;
}

ShadowNode::Shared findParent(ShadowNode::Shared root, Tag tag){
  if (root->getTag() == tag){
    return nullptr;
  }
  for (ShadowNode::Shared child: root->getChildren()){
    if (child->getTag() == tag){
      return root;
    }
    auto res = findParent(child, tag);
    if (res != nullptr){
      return res;
    }
  }
  return nullptr;
}

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &,
    RootShadowNode::Shared const &oldRootShadowNode,
#if REACT_NATIVE_MINOR_VERSION >= 73
    RootShadowNode::Unshared const &newRootShadowNode) noexcept {
#else
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
#endif
  auto mutations = calculateShadowViewMutations(*oldRootShadowNode, *newRootShadowNode);
      
      
  for (auto &mutation: mutations){
    if (mutation.type == ShadowViewMutation::Create){
      lap_->tagToNativeID_->insert_or_assign(mutation.newChildShadowView.tag, mutation.newChildShadowView.props->nativeId);
      lap_->transferConfigFromNativeTag(mutation.newChildShadowView.tag);
    }
  }

  auto rootNode = newRootShadowNode->ShadowNode::clone(ShadowNodeFragment{});
  if (ReanimatedCommitMarker::isReanimatedCommit()) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // PropsRegistry
    return std::static_pointer_cast<RootShadowNode>(rootNode);
  }

  // ShadowTree not commited by Reanimated, apply updates from PropsRegistry

  {
    auto lock = propsRegistry_->createLock();

    propsRegistry_->for_each(
        [&](const ShadowNodeFamily &family, const folly::dynamic &props) {
          auto newRootNode =
              cloneShadowTreeWithNewProps(rootNode, family, RawProps(props));

          if (newRootNode == nullptr) {
            // this happens when React removed the component but Reanimated
            // still tries to animate it, let's skip update for this specific
            // component
            return;
          }
          rootNode = newRootNode;
        });
  }

  // If the commit comes from React Native then skip one commit from Reanimated
  // since the ShadowTree to be committed by Reanimated may not include the new
  // changes from React Native yet and all changes of animated props will be
  // applied in ReanimatedCommitHook by iterating over PropsRegistry.
  propsRegistry_->pleaseSkipReanimatedCommit();

  return std::static_pointer_cast<RootShadowNode>(rootNode);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
