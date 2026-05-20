#include "RNReanimatedSharedTransitionBoundaryShadowNode.h"

namespace facebook::react {

extern const char RNReanimatedSharedTransitionBoundaryComponentName[] = "RNReanimatedSharedTransitionBoundary";

void RNReanimatedSharedTransitionBoundaryShadowNode::initialize() {
  traits_.unset(ShadowNodeTraits::ForceFlattenView);
}

} // namespace facebook::react
