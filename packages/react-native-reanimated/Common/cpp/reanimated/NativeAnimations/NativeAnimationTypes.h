#pragma once

#include <react/renderer/core/ReactPrimitives.h>

#include <cstddef>
#include <cstdint>
#include <functional>

namespace reanimated {

enum class NativeAnimationOwner : uint8_t {
  Layout,
  CSSTransition,
  CSSAnimation,
};

struct NativeAnimationHandle {
  facebook::react::SurfaceId surfaceId;
  facebook::react::Tag tag;
  NativeAnimationOwner owner;
  uint64_t generation;

  bool operator==(const NativeAnimationHandle &) const = default;
};

struct NativeAnimationHandleHash {
  size_t operator()(const NativeAnimationHandle &handle) const {
    size_t seed = std::hash<facebook::react::SurfaceId>{}(handle.surfaceId);
    seed ^= std::hash<facebook::react::Tag>{}(handle.tag) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
    seed ^= std::hash<uint8_t>{}(static_cast<uint8_t>(handle.owner)) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
    seed ^= std::hash<uint64_t>{}(handle.generation) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
    return seed;
  }
};

struct NativeAnimationViewKey {
  facebook::react::SurfaceId surfaceId;
  facebook::react::Tag tag;

  bool operator==(const NativeAnimationViewKey &) const = default;
};

struct NativeAnimationViewKeyHash {
  size_t operator()(const NativeAnimationViewKey &key) const {
    size_t seed = std::hash<facebook::react::SurfaceId>{}(key.surfaceId);
    seed ^= std::hash<facebook::react::Tag>{}(key.tag) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
    return seed;
  }
};

enum class NativeAnimationTarget : uint8_t {
  Opacity,
  Position,
  BoundsSize,
  Transform,
};

enum class NativeAnimationStartValueSource : uint8_t {
  ExplicitValue,
  CurrentVisualValue,
};

enum class NativeAnimationMountingMode : uint8_t {
  FinalState,
  RetainedCurrentState,
};

enum class NativeAnimationCancelDisposition : uint8_t {
  SettleToCommittedModel,
  PreservePresentationForRetarget,
  RemoveRetainedView,
};

enum class NativeAnimationOutcome : uint8_t {
  Finished,
  Cancelled,
  Interrupted,
  Rejected,
  Failed,
};

enum class NativeAnimationResultReason : uint8_t {
  None,
  UnsupportedCapability,
  MissingExecutor,
  MissingTarget,
  InvalidPlan,
  CancelledByOwner,
  Replaced,
  PlatformFailure,
};

struct NativeAnimationResult {
  NativeAnimationOutcome outcome;
  NativeAnimationResultReason reason;

  bool finished() const {
    return outcome == NativeAnimationOutcome::Finished;
  }
};

} // namespace reanimated
