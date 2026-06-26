#include "REASharedTransitionBoundaryShadowNode.h"

namespace facebook::react {

extern const char REASharedTransitionBoundaryComponentName[] = "REASharedTransitionBoundary";

void REASharedTransitionBoundaryShadowNode::initialize() {
  // The boundary uses `display: contents` so it doesn't affect layout,
  // but React would flatten such a view away. Unsetting this trait keeps
  // the view in the native tree, so it shows up in mutations and can be
  // tracked in the light tree.
  traits_.unset(ShadowNodeTraits::ForceFlattenView);
}

} // namespace facebook::react
