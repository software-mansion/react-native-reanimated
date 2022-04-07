#include <react/renderer/uimanager/UIManagerBinding.h>

#include "FabricUtils.h"

using namespace facebook::react;

namespace reanimated {

std::shared_ptr<UIManager> getUIManagerFromBinding(jsi::Runtime &rt) {
  auto binding = UIManagerBinding::getBinding(rt);
  react_native_assert(
      binding != nullptr); // too early, UIManagerBinding is not registered yet
  return reinterpret_cast<UIManagerBindingPublic *>(&*binding)->uiManager_;
}

ShadowTreeRegistry *getShadowTreeRegistryFromUIManager(
    const std::shared_ptr<UIManager> &uiManager) {
  return &(
      reinterpret_cast<UIManagerPublic *>(&*uiManager)->shadowTreeRegistry_);
}

std::shared_ptr<const ContextContainer> getContextContainerFromUIManager(
    const std::shared_ptr<UIManager> &uiManager) {
  return reinterpret_cast<UIManagerPublic *>(&*uiManager)->contextContainer_;
}

inline static UIManagerDelegate *getDelegateFromUIManager(
    const std::shared_ptr<UIManager> &uiManager) {
  return reinterpret_cast<UIManagerPublic *>(&*uiManager)->delegate_;
}

void UIManager_dispatchCommand(
    const std::shared_ptr<UIManager> &uiManager,
    const ShadowNode::Shared &shadowNode,
    std::string const &commandName,
    folly::dynamic const &args) {
  UIManagerDelegate *delegate_ = getDelegateFromUIManager(uiManager);

  // copied from UIManager.cpp
  if (delegate_) {
    delegate_->uiManagerDidDispatchCommand(shadowNode, commandName, args);
  }
}

LayoutMetrics UIManager_getRelativeLayoutMetrics(
    const std::shared_ptr<UIManager> &uiManager,
    ShadowNode const &shadowNode,
    ShadowNode const *ancestorShadowNode,
    LayoutableShadowNode::LayoutInspectingPolicy policy) {
  // based on implementation from UIManager.cpp

  ShadowTreeRegistry *shadowTreeRegistry =
      getShadowTreeRegistryFromUIManager(uiManager);

  // We might store here an owning pointer to `ancestorShadowNode` to ensure
  // that the node is not deallocated during method execution lifetime.
  auto owningAncestorShadowNode = ShadowNode::Shared{};

  if (!ancestorShadowNode) {
    shadowTreeRegistry->visit(
        shadowNode.getSurfaceId(), [&](ShadowTree const &shadowTree) {
          owningAncestorShadowNode =
              shadowTree.getCurrentRevision().rootShadowNode;
          ancestorShadowNode = owningAncestorShadowNode.get();
        });
  } else {
    // It is possible for JavaScript (or other callers) to have a reference
    // to a previous version of ShadowNodes, but we enforce that
    // metrics are only calculated on most recently committed versions.
    owningAncestorShadowNode =
        uiManager->getNewestCloneOfShadowNode(*ancestorShadowNode);
    ancestorShadowNode = owningAncestorShadowNode.get();
  }

  auto layoutableAncestorShadowNode =
      traitCast<LayoutableShadowNode const *>(ancestorShadowNode);

  if (!layoutableAncestorShadowNode) {
    return EmptyLayoutMetrics;
  }

  return LayoutableShadowNode::computeRelativeLayoutMetrics(
      shadowNode.getFamily(), *layoutableAncestorShadowNode, policy);
}

} // namespace reanimated
