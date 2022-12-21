#ifdef RCT_NEW_ARCH_ENABLED

#if REACT_NATIVE_MINOR_VERSION < 69
#error \
    "Reanimated 3 does not support React Native 0.68.x when Fabric is enabled. Please upgrade to React Native 0.69.0 or newer if you want to use Reanimated with the new architecture."
#endif

#include "FabricUtils.h"

#include <react/renderer/debug/SystraceSection.h>
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

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
