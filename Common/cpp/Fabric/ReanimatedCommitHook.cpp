#include <react/renderer/core/ComponentDescriptor.h>

#include <set>

#include "FabricUtils.h"
#include "ReanimatedCommitHook.h"

using namespace facebook::react;

namespace reanimated {

static inline ShadowNode::Unshared cloneTree(
    ShadowNode::Shared oldRootNode,
    const ShadowNodeFamily &family,
    const folly::dynamic &dynProps,
    const PropsParserContext &propsParserContext,
    const std::shared_ptr<PropsRegistry> propsRegistry,
    std::set<ShadowNode *> &yogaChildrenUpdates) {
  auto ancestors = family.getAncestors(*oldRootNode);

  if (ancestors.empty()) {
    return ShadowNode::Unshared{nullptr};
  }

  auto &parent = ancestors.back();
  auto &oldShadowNode = parent.first.get().getChildren().at(parent.second);

  const auto props = oldShadowNode->getComponentDescriptor().cloneProps(
      propsParserContext, oldShadowNode->getProps(), RawProps(dynProps));

  auto newShadowNode = oldShadowNode->clone({/* .props = */ props});

  auto childNode = newShadowNode;

  for (auto it = ancestors.rbegin(); it != ancestors.rend(); ++it) {
    auto &parentNode = it->first.get();
    auto childIndex = it->second;

    auto children = parentNode.getChildren();
    react_native_assert(
        ShadowNode::sameFamily(*children.at(childIndex), *childNode));

    auto isSealed = parentNode.getSealed();
    if (!isSealed) {
      // optimization
      auto &parentNodeNonConst = const_cast<ShadowNode &>(parentNode);
      parentNodeNonConst.replaceChild(
          *children.at(childIndex), childNode, childIndex);
      yogaChildrenUpdates.insert(&parentNodeNonConst);
      return std::const_pointer_cast<ShadowNode>(oldRootNode);
    }

    children[childIndex] = childNode;

    childNode = parentNode.clone({
        ShadowNodeFragment::propsPlaceholder(),
        std::make_shared<SharedShadowNodeList>(children),
    });
  }

  return std::const_pointer_cast<ShadowNode>(childNode);
}

RootShadowNode::Unshared ReanimatedCommitHook::shadowTreeWillCommit(
    ShadowTree const &shadowTree,
    RootShadowNode::Shared const &oldRootShadowNode,
    RootShadowNode::Unshared const &newRootShadowNode) const noexcept {
  if (propsRegistry_->isLastReanimatedRoot(newRootShadowNode)) {
    // ShadowTree commited by Reanimated, no need to apply updates from
    // PropsRegistry or re-calculate layout
    return newRootShadowNode;
  }

  auto contextContainer = getContextContainerFromUIManager(&*uiManager_);
  auto surfaceId = newRootShadowNode->getSurfaceId();
  PropsParserContext propsParserContext{surfaceId, *contextContainer};

  auto rootNode = newRootShadowNode->ShadowNode::clone(ShadowNodeFragment{});

  rootNode->sealRecursive(); // is this necessary?

  std::set<ShadowNode *> yogaChildrenUpdates;

  {
    auto lock = propsRegistry_->createLock();

    propsRegistry_->for_each(
        [&](ShadowNodeFamily const &family, const folly::dynamic &dynProps) {
          auto newRootNode = cloneTree(
              rootNode,
              family,
              dynProps,
              propsParserContext,
              propsRegistry_,
              yogaChildrenUpdates);

          if (newRootNode == nullptr) {
            // this happens when React removed the component but Reanimated
            // still tries to animate it, let's skip update for this specific
            // component
            return;
          }

          rootNode = newRootNode;
        });
  }

  for (ShadowNode *shadowNode : yogaChildrenUpdates) {
    static_cast<YogaLayoutableShadowNode *>(shadowNode)->updateYogaChildren();
  }

  // assert(rootNode->getChildren().size() > 0);
  // auto oldChild = rootNode->getChildren()[0];
  // auto newChild = oldChild->clone({});
  // rootNode->replaceChild(*oldChild, newChild, 0);

  // rootNode = rootNode->cloneTree(newChild->getFamily(), [&](ShadowNode const
  // &oldShadowNode) {
  //   return oldShadowNode.clone({});
  // });

  // std::static_pointer_cast<YogaLayoutableShadowNode>(rootNode)
  //     ->updateYogaChildren();

  auto newRootShadowNode2 = std::static_pointer_cast<RootShadowNode>(rootNode);

  // trigger layout here (commit hooks are executed after RN calls
  // layoutIfNeeded!)
  std::vector<LayoutableShadowNode const *> affectedLayoutableNodes{};
  affectedLayoutableNodes.reserve(1024);
  newRootShadowNode2->layoutIfNeeded(&affectedLayoutableNodes);

  return newRootShadowNode2;
}

} // namespace reanimated
