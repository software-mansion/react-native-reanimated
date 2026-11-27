#pragma once

#include <reanimated/LayoutAnimations/LiveLayoutLeaf.h>
#include <reanimated/NativeAnimations/NativeAnimationHost.h>
#include <reanimated/NativeAnimations/NativeAnimationTrack.h>

#include <folly/dynamic.h>
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/mounting/ShadowView.h>

#include <optional>
#include <variant>
#include <vector>

namespace reanimated {

/// A number, or the matrix of the style transform.
using LeafValue = std::variant<double, facebook::react::Transform>;

/// The value that `view` has for the layout animation key of `target`.
LeafValue leafValue(native_animation::AnimationTarget target, const facebook::react::ShadowView &view);

/// True when the mount of `view` gives the model the end value of `track`.
bool endsAtMountedValue(const native_animation::AnimationTrack &track, const facebook::react::ShadowView &view);

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
  /// In the form of the style prop.
  std::optional<folly::dynamic> transform;
};

/// Reads the result of `LayoutAnimationsManager.captureLiveLeaves` on the UI runtime.
LiveLeafValues liveLeafValues(facebook::jsi::Runtime &rt, const facebook::jsi::Object &leafValues);

/// The tracks that play the animation of `buildSummary` (the result of `LayoutAnimationsManager.build` on the
/// UI runtime) on the view that the commit leaves as `after`, or the first reason why `host` cannot repeat
/// that animation. A leaf that continues a live leaf has no track: the live track plays it.
/// `MountedModelMustMatchEndpoint` is for an animation that ends at the state of `after`. `HoldWithoutCommit`
/// is for an animation that ends at other values, which stay on screen until the owner removes the tracks.
std::variant<NativeLayoutTracks, native_animation::TrackBuildFailure> makeNativeLayoutTracks(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &buildSummary,
    const facebook::react::ShadowView &after,
    const native_animation::NativeAnimationHost &host,
    native_animation::EndpointPolicy endpointPolicy);

} // namespace reanimated
