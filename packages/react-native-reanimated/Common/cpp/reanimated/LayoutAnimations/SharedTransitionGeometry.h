#pragma once

#include <folly/dynamic.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

#include <optional>

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

// The font size between the one that the start draws and the one in the props of the target. Null for other views.
std::optional<Float> textFontSizeAt(const ShadowView &start, const ShadowView &target, double progress);

// How far the frame has moved from the size of the start to the size of the target, along the dimension that changes
// more. Null when the size does not change.
std::optional<double> sizeProgress(const ShadowView &start, const ShadowView &target, const Frame &frame);

// A Text draws the attributed string of its state, not its props. The state that draws this font size is scaled from
// the own state of the Text. Null for other views and for their own font size.
State::Shared textStateWithFontSize(const ShadowView &text, Float fontSize);

} // namespace reanimated
