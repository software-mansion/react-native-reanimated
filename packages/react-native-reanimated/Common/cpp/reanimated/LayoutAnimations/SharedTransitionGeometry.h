#pragma once

#include <folly/dynamic.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

namespace reanimated {

// The frame and the props `transform`, `transformOrigin` and `opacity` of a shared transition carrier. The opacity is
// left out when both ends and the base props of the frame have the same one.
struct SharedTransitionGeometry {
  Frame frame;
  folly::dynamic props;
};

SharedTransitionGeometry interpolateSharedTransitionGeometry(
    const ShadowView &start,
    const ShadowView &target,
    double progress,
    Float baseOpacity);

} // namespace reanimated
