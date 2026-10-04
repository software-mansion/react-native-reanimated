#pragma once

#include <reanimated/NativeAnimations/NativeAnimationHost.h>

#include <react/renderer/mounting/ShadowView.h>

#include <vector>

namespace reanimated {

/// The value that the host view model has for Position after the mount of `view`.
native_animation::AnimationPoint mountedPosition(const facebook::react::ShadowView &view);

/// The value that the host view model has for Opacity after the mount of `view`.
double mountedOpacity(const facebook::react::ShadowView &view);

#ifndef NDEBUG
/// The test form of a native layout start. The next `count` layout animation starts of the view take it.
struct ArmedNativeLayoutStart {
  double durationMs;
  double delayMs;
  bool animatesOpacity;
  int count;
};

/// Linear tracks from the mounted state of `before` to the mounted state of `after`.
std::vector<native_animation::AnimationTrack> makeTracks(
    const ArmedNativeLayoutStart &armedStart,
    const facebook::react::ShadowView &before,
    const facebook::react::ShadowView &after);
#endif

} // namespace reanimated
