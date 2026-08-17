#include <reanimated/NativeAnimations/NativeAnimationTrace.h>

#include <chrono>

namespace reanimated::native_animation {

#ifndef NDEBUG

void recordNativeAnimationTrace(
    NativeAnimationTraceSink &sink,
    const NativeAnimationTraceEventType event,
    const AnimationHandle handle,
    std::optional<AnimationTargetClaim> target,
    std::optional<AnimationOutcome> outcome,
    std::optional<AnimationResultReason> reason) {
  const auto now = std::chrono::steady_clock::now().time_since_epoch();
  sink.record(NativeAnimationTraceEvent{
      .monotonicTimeMs = std::chrono::duration<double, std::milli>(now).count(),
      .event = event,
      .handle = handle,
      .target = target,
      .outcome = outcome,
      .reason = reason,
  });
}

#endif

} // namespace reanimated::native_animation
