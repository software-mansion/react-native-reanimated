#pragma once

#include <folly/dynamic.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/Compat/ReactNativeVersionCompat.h>
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

#if REACT_NATIVE_VERSION_MINOR >= 89
// The font size between the one that the start draws and the one in the props of the target. Null for other views.
std::optional<Float> textFontSizeAt(const ShadowView &start, const ShadowView &target, double progress);

// How far the frame has moved from the size of the start to the size of the target, along the dimension that changes
// more. Null when the size does not change.
std::optional<double> sizeProgress(const ShadowView &start, const ShadowView &target, const Frame &frame);

// A Text draws the attributed string of its state, not its props. The state that draws this font size is scaled from
// the own state of the Text. Null for other views and for their own font size.
State::Shared textStateWithFontSize(const ShadowView &text, Float fontSize);

// Whether two Texts have the same strings in the same runs.
bool haveSameRuns(const ShadowView &start, const ShadowView &target);

// How far a font size is from the one that the start draws to the one that the target draws. Null when they are the
// same.
std::optional<double> fontSizeProgress(const ShadowView &start, const ShadowView &target, Float fontSize);

// The state of a Text whose runs draw sizes between their sizes in the start and in the target, which have the same
// runs. Null when the sizes are the same.
State::Shared textStateBetween(const ShadowView &start, const ShadowView &target, double progress);
#endif

} // namespace reanimated
