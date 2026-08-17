#pragma once

#include <react/renderer/core/ReactPrimitives.h>

#include <cstddef>
#include <cstdint>
#include <variant>

namespace reanimated::native_animation {

using facebook::react::SurfaceId;
using facebook::react::Tag;

enum class AnimationOwner : uint8_t {
  Layout,
  CSSTransition,
  CSSAnimation,
};

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

enum class AnimationTargetKind : uint8_t {
  Opacity,
  Position,
  PositionX,
  PositionY,
  Size,
  Width,
  Height,
  BackgroundColor,
  BorderColor,
  BorderRadius,
  BorderWidth,
  ShadowColor,
  ShadowOpacity,
  ShadowRadius,
  ShadowOffset,
  Transform,
};

struct AnimationTarget {
  AnimationTargetKind kind;

  bool operator==(const AnimationTarget &) const = default;
};

struct AllVisualTargets {
  bool operator==(const AllVisualTargets &) const = default;
};

using AnimationTargetClaim = std::variant<AnimationTarget, AllVisualTargets>;

bool targetsConflict(const AnimationTargetClaim &lhs, const AnimationTargetClaim &rhs);

} // namespace reanimated::native_animation
