#pragma once

#include <string>
#include <vector>

// LayoutAnimationTrace start
#ifndef NDEBUG
#include <reanimated/LayoutAnimations/LayoutAnimationTrace.h>
#endif // NDEBUG
// LayoutAnimationTrace end

namespace reanimated {

// A single animated channel of a native layout animation. Mirrors
// `NativeLayoutAnimationProperty` on the JS side. `offsets` are normalized to
// [0, 1] and `values` holds the matching keyframe values (same length).
//
// `keyPath` is a canonical, platform-agnostic channel name, one of: `opacity`,
// `originX`, `originY`, `width`, `height`, `translateX`, `translateY`,
// `scaleX`, `scaleY`, `rotation`, `rotationX`, `rotationY`, `skewX`,
// `perspective`. Angles are expressed in radians. The platform player maps
// these onto Core Animation key paths (iOS) or View properties (Android).
struct NativeLayoutAnimationProperty {
  std::string keyPath;
  std::vector<double> offsets;
  std::vector<double> values;
};

// Generic, pre-sampled description of a layout animation. Produced in JS by
// sampling the regular Reanimated animation objects, and played natively by the
// platform animation engine. Mirrors `NativeLayoutAnimationDescriptor` on the
// JS side.
struct NativeLayoutAnimationDescriptor {
  double durationMs = 0;
  std::vector<NativeLayoutAnimationProperty> properties;
  // LayoutAnimationTrace start
#ifndef NDEBUG
  uint64_t traceGeneration = 0;
  layout_animation_trace::AnimationType traceAnimationType = layout_animation_trace::AnimationType::Layout;
#endif // NDEBUG
  // LayoutAnimationTrace end
};

} // namespace reanimated
