#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <functional>
#include <memory>
#include <variant>
#include <vector>

namespace reanimated::native_animation {

using PlatformUIOperation = std::function<void()>;

class PlatformUIScheduler {
 public:
  virtual ~PlatformUIScheduler() = default;
  virtual void schedule(PlatformUIOperation operation) = 0;
};

class ResolvedAnimationTarget {
 public:
  virtual ~ResolvedAnimationTarget() = default;
};

using ResolvedAnimationTargets = std::vector<std::unique_ptr<ResolvedAnimationTarget>>;
using TargetBatchResolution = std::variant<ResolvedAnimationTargets, AnimationResultReason>;

class NativeAnimationTargetResolver {
 public:
  virtual ~NativeAnimationTargetResolver() = default;
  // Returns one resolved target for each input target, in the same order.
  virtual TargetBatchResolution resolveTargets(
      const AnimationHandle &handle,
      const std::vector<AnimationTarget> &targets) = 0;
};

struct ResolvedAnimationTrack {
  AnimationTrack track;
  std::unique_ptr<ResolvedAnimationTarget> target;
};

class PreparedNativeAnimation {
 public:
  virtual ~PreparedNativeAnimation() = default;
};

using NativeAnimationPreparation = std::variant<std::unique_ptr<PreparedNativeAnimation>, AnimationResultReason>;
using NativeTrackTerminalCallback = std::function<void(AnimationTarget, bool)>;

struct NativeTrackInterruption {
  AnimationHandle handle;
  AnimationTarget target;
};

class NativeAnimationExecutor {
 public:
  virtual ~NativeAnimationExecutor() = default;

  // This method completes mounted-target checks and current-value reads. It
  // must not change model values, claims, or physical animation state.
  virtual NativeAnimationPreparation prepare(
      const AnimationHandle &handle,
      std::vector<ResolvedAnimationTrack> tracks) = 0;

  // prepare() has made start infallible. This method replaces the listed
  // physical tracks and starts the prepared command in one UI operation.
  virtual void start(
      const AnimationHandle &handle,
      std::unique_ptr<PreparedNativeAnimation> prepared,
      const std::vector<NativeTrackInterruption> &interruptions,
      NativeTrackTerminalCallback terminal) = 0;

  virtual void cancel(const AnimationHandle &handle, const std::vector<AnimationTarget> &targets) = 0;

  // On success this method reads the current visible values, freezes them in
  // the platform model without implicit animation, and removes the physical
  // tracks, all in one UI operation. After it returns, the listed tracks no
  // longer run and produce no terminal events. The coordinator releases the
  // command without a separate cancel call. On failure it changes nothing.
  virtual std::variant<std::vector<CapturedTargetValue>, AnimationResultReason> handoff(
      const AnimationHandle &handle,
      const std::vector<AnimationTarget> &targets) = 0;
};

} // namespace reanimated::native_animation
