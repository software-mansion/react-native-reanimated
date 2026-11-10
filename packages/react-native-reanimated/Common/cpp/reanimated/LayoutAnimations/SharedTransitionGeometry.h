#pragma once

#include <folly/dynamic.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

namespace reanimated {

// The frame and the props `transform` and `transformOrigin` of a shared transition carrier.
struct SharedTransitionGeometry {
  Frame frame;
  folly::dynamic props;
};

SharedTransitionGeometry
interpolateSharedTransitionGeometry(const ShadowView &start, const ShadowView &target, double progress);

} // namespace reanimated
