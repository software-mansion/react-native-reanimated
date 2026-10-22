#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTrack.h>

#include <jsi/jsi.h>
#include <react/renderer/mounting/ShadowView.h>

#include <variant>
#include <vector>

namespace reanimated {

/// The number of layout animation leaves that the native route takes: one for each native target.
inline constexpr size_t MAX_NATIVE_LAYOUT_LEAVES = 3;

/// The value that the host view model has for PositionX and PositionY after the mount of `view`.
native_animation::AnimationPoint mountedPosition(const facebook::react::ShadowView &view);

/// The value that the host view model has for Opacity after the mount of `view`.
double mountedOpacity(const facebook::react::ShadowView &view);

struct NativeLayoutTracks {
  double originTimestampMs;
  std::vector<native_animation::AnimationTrack> tracks;
};

/// The tracks that play the whole animation of `buildSummary` (the result of `LayoutAnimationsManager.build`
/// on the UI runtime) on the view that changes from `before` to `after`, or the first reason why native
/// playback cannot repeat that animation.
std::variant<NativeLayoutTracks, native_animation::TrackBuildFailure> makeNativeLayoutTracks(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &buildSummary,
    const facebook::react::ShadowView &before,
    const facebook::react::ShadowView &after);

} // namespace reanimated
