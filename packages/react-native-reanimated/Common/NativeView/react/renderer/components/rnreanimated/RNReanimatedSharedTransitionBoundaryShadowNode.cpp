#include "RNReanimatedSharedTransitionBoundaryShadowNode.h"

namespace facebook::react {

extern const char RNReanimatedSharedTransitionBoundaryComponentName[] = "RNReanimatedSharedTransitionBoundary";

void RNReanimatedSharedTransitionBoundaryShadowNode::initialize() {
//  // When the boundary is cloned and has a child node, the child node
//  // should be cloned as well to ensure it is mutable.
//  if (!getChildren().empty()) {
//    prepareChildren();
//  }
  traits_.unset(ShadowNodeTraits::ForceFlattenView);
}

void RNReanimatedSharedTransitionBoundaryShadowNode::prepareChildren() {
  const auto &children = getChildren();
  react_native_assert(children.size() == 1 && "RNReanimatedSharedTransitionBoundary received more than one child");

  const auto directChild = children[0];

  const auto clonedChild = directChild->clone({});

  const auto childWithProtectedAccess =
      std::static_pointer_cast<RNReanimatedSharedTransitionBoundaryShadowNode>(clonedChild);
  childWithProtectedAccess->traits_.unset(ShadowNodeTraits::ForceFlattenView);

  replaceChild(*directChild, clonedChild);

  const auto grandChild = clonedChild->getChildren()[0];
  const auto clonedGrandChild = grandChild->clone({});
  clonedChild->replaceChild(*grandChild, clonedGrandChild);
}

void RNReanimatedSharedTransitionBoundaryShadowNode::appendChild(const std::shared_ptr<const ShadowNode> &child) {
  YogaLayoutableShadowNode::appendChild(child);
//  prepareChildren();
}

void RNReanimatedSharedTransitionBoundaryShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
//  react_native_assert(getChildren().size() == 1);
//  react_native_assert(getChildren()[0]->getChildren().size() == 1);
//
//  auto child = std::static_pointer_cast<const YogaLayoutableShadowNode>(getChildren()[0]);
//  auto grandChild = std::static_pointer_cast<const YogaLayoutableShadowNode>(child->getChildren()[0]);
//
//  child->ensureUnsealed();
//  grandChild->ensureUnsealed();
//
//  auto mutableChild = std::const_pointer_cast<YogaLayoutableShadowNode>(child);
//  auto mutableGrandChild = std::const_pointer_cast<YogaLayoutableShadowNode>(grandChild);
//
//  // Pass through metrics from boundary to wrapper to actual content
//  auto metrics = grandChild->getLayoutMetrics();
//  mutableChild->setLayoutMetrics(metrics);
//
//  auto metricsNoOrigin = grandChild->getLayoutMetrics();
//  metricsNoOrigin.frame.origin = Point{};
//  mutableGrandChild->setLayoutMetrics(metricsNoOrigin);
}

} // namespace facebook::react
