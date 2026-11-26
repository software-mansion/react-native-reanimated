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

// A Text draws the attributed string of its state, not its props. At this progress, the state of a Text carrier draws a
// font size between the one drawn at the start and the one in the props of the target. It is null for other views and
// for equal font sizes.
State::Shared textStateAt(const ShadowView &start, const ShadowView &target, double progress);

} // namespace reanimated
