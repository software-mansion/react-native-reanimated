#pragma once

#include <react/renderer/core/ReactPrimitives.h>

#include <cstddef>
#include <cstdint>

namespace reanimated::native_animation {

using facebook::react::SurfaceId;
using facebook::react::Tag;

enum class AnimationOwner : uint8_t {
  Layout,
  CSSTransition,
  CSSAnimation,
};

/// One physical command. A new command takes a new generation; a retired handle is never used again.
struct AnimationHandle {
  SurfaceId surfaceId;
  Tag tag;
  AnimationOwner owner;
  uint64_t generation;

  bool operator==(const AnimationHandle &) const = default;
};

struct AnimationHandleHash {
  size_t operator()(const AnimationHandle &handle) const noexcept;
};

enum class AnimationTarget : uint8_t {
  Opacity,
  Position,
  PositionX,
  PositionY,
  Size,
  /// The size changes and the origin of the frame stays.
  Width,
  Height,
  BackgroundColor,
  BorderColor,
  BorderRadius,
  ShadowColor,
  ShadowOpacity,
  ShadowRadius,
  ShadowOffset,
  /// The style transform. Its value is an ordered operation list.
  Transform,
};

/// Position overlaps its two axes and Size overlaps its two dimensions. Other targets overlap only themselves.
bool targetsOverlap(AnimationTarget lhs, AnimationTarget rhs);

bool isSizeTarget(AnimationTarget target);

/// One physical track. It carries the command identity, so a late event cannot reach a replacement.
struct TrackKey {
  AnimationHandle handle;
  AnimationTarget target;

  bool operator==(const TrackKey &) const = default;
};

struct TrackKeyHash {
  size_t operator()(const TrackKey &key) const noexcept;
};

} // namespace reanimated::native_animation
