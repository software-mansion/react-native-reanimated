#ifdef RCT_NEW_ARCH_ENABLED

#include "FabricUtils.h"

#include <react/renderer/uimanager/UIManagerBinding.h>

using namespace facebook::react;

namespace reanimated {

#ifdef ANDROID
RuntimeExecutor getRuntimeExecutorFromBinding(Binding *binding) {
  BindingPublic *bindingPublic = reinterpret_cast<BindingPublic *>(binding);
  SchedulerPublic *schedulerPublic =
      reinterpret_cast<SchedulerPublic *>((bindingPublic->scheduler_).get());
  return schedulerPublic->runtimeExecutor_;
}
#endif

inline static const UIManagerPublic *getUIManagerPublic(
    const UIManager *uiManager) {
  return reinterpret_cast<const UIManagerPublic *>(uiManager);
}

std::shared_ptr<const ContextContainer> getContextContainerFromUIManager(
    const UIManager *uiManager) {
  return getUIManagerPublic(uiManager)->contextContainer_;
}

inline static UIManagerDelegate *getDelegateFromUIManager(
    const UIManager *uiManager) {
  return getUIManagerPublic(uiManager)->delegate_;
}

void UIManager_dispatchCommand(
    const std::shared_ptr<UIManager> &uiManager,
    const ShadowNode::Shared &shadowNode,
    std::string const &commandName,
    folly::dynamic const &args) {
  auto delegate_ = getDelegateFromUIManager(&*uiManager);

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
  const auto &shadowTreeRegistry = uiManager->getShadowTreeRegistry();

  // We might store here an owning pointer to `ancestorShadowNode` to ensure
  // that the node is not deallocated during method execution lifetime.
  auto owningAncestorShadowNode = ShadowNode::Shared{};

  if (!ancestorShadowNode) {
    shadowTreeRegistry.visit(
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

SharedShadowNode UIManager_cloneNode(
    const UIManager *uiManager,
    const ShadowNode::Shared &shadowNode,
    const SharedShadowNodeSharedList &children,
    const RawProps *rawProps) {
  auto delegate_ = getDelegateFromUIManager(uiManager);
  auto contextContainer_ = getContextContainerFromUIManager(uiManager);

  // copied from UIManager.cpp
  PropsParserContext propsParserContext{
      shadowNode->getFamily().getSurfaceId(), *contextContainer_.get()};

  auto &componentDescriptor = shadowNode->getComponentDescriptor();
  auto clonedShadowNode = componentDescriptor.cloneShadowNode(
      *shadowNode,
      {
          /* .props = */
          rawProps ? componentDescriptor.cloneProps(
                         propsParserContext, shadowNode->getProps(), *rawProps)
                   : ShadowNodeFragment::propsPlaceholder(),
          /* .children = */ children,
      });

  if (delegate_) {
    delegate_->uiManagerDidCloneShadowNode(
        *shadowNode.get(), *clonedShadowNode);
  }

  return clonedShadowNode;
}

void UIManager_appendChild(
    const ShadowNode::Shared &parentShadowNode,
    const ShadowNode::Shared &childShadowNode) {
  // copied from UIManager.cpp
  auto &componentDescriptor = parentShadowNode->getComponentDescriptor();
  componentDescriptor.appendChild(parentShadowNode, childShadowNode);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
