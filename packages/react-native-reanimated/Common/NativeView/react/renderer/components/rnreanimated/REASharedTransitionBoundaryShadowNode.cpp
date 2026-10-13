#include "REASharedTransitionBoundaryShadowNode.h"

#include <algorithm>

namespace facebook::react {

extern const char REASharedTransitionBoundaryComponentName[] = "REASharedTransitionBoundary";

void REASharedTransitionBoundaryShadowNode::initialize() {
  // The boundary uses `display: contents` so it doesn't affect layout,
  // but React would flatten such a view away. Unsetting this trait keeps
  // the view in the native tree, so it shows up in mutations and can be
  // tracked in the light tree.
  traits_.unset(ShadowNodeTraits::ForceFlattenView);
}

void REASharedTransitionBoundaryShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);

  // Android only delivers touches within a view's bounds, breaking native
  // gestures inside a zero-sized `display: contents` frame. The frame and
  // its children share the parent's origin, so only the size needs to grow.
  const auto contentBounds = getContentBounds();
  auto layoutMetrics = getLayoutMetrics();
  layoutMetrics.frame.size = {contentBounds.getMaxX(), contentBounds.getMaxY()};
  // The base class derived overflowInset against the old zero frame; only
  // children at negative coordinates overflow the grown one.
  layoutMetrics.overflowInset = {
      std::min(contentBounds.getMinX(), Float{0}), std::min(contentBounds.getMinY(), Float{0}), 0, 0};
  setLayoutMetrics(layoutMetrics);
}

} // namespace facebook::react
