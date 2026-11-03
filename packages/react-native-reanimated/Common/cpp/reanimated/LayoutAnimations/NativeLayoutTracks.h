#pragma once

#include <reanimated/LayoutAnimations/LiveLayoutLeaf.h>
#include <reanimated/NativeAnimations/NativeAnimationHost.h>
#include <reanimated/NativeAnimations/NativeAnimationTrack.h>

#include <jsi/jsi.h>
#include <react/renderer/mounting/ShadowView.h>

#include <optional>
#include <variant>
#include <vector>

namespace reanimated {

/// The number of layout animation leaves that the native route takes: one for each native target.
inline constexpr size_t MAX_NATIVE_LAYOUT_LEAVES = 5;

/// The value that `view` has for the layout animation key of `target`.
double leafValue(native_animation::AnimationTarget target, const facebook::react::ShadowView &view);

struct NativeLayoutTracks {
  double originTimestampMs;
  std::vector<native_animation::AnimationTrack> tracks;
};

/// The leaves whose tracks are `tracks`.
LiveLayoutLeaves liveLayoutLeaves(const std::vector<native_animation::TrackKey> &tracks);

/// The values that the live leaves of a view have. A key with no live leaf has no value.
struct LiveLeafValues {
  std::optional<double> originX;
  std::optional<double> originY;
  std::optional<double> width;
  std::optional<double> height;
  std::optional<double> opacity;
};

/// Reads the result of `LayoutAnimationsManager.captureLiveLeaves` on the UI runtime.
LiveLeafValues liveLeafValues(facebook::jsi::Runtime &rt, const facebook::jsi::Object &leafValues);

/// The tracks that play the animation of `buildSummary` (the result of `LayoutAnimationsManager.build` on the
/// UI runtime) on the view that the commit leaves as `after`, or the first reason why `host` cannot repeat
/// that animation. A leaf that continues a live leaf has no track: the live track plays it.
std::variant<NativeLayoutTracks, native_animation::TrackBuildFailure> makeNativeLayoutTracks(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &buildSummary,
    const facebook::react::ShadowView &after,
    const native_animation::NativeAnimationHost &host);

} // namespace reanimated
