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
    std::optional<AnimationResultReason> reason,
    const uint8_t objective) {
  const auto now = std::chrono::steady_clock::now().time_since_epoch();
  sink.record(NativeAnimationTraceEvent{
      .monotonicTimeMs = std::chrono::duration<double, std::milli>(now).count(),
      .event = event,
      .handle = handle,
      .target = target,
      .objective = objective,
      .outcome = outcome,
      .reason = reason,
  });
}

void recordNativeAnimationRouteTrace(
    NativeAnimationTraceSink &sink,
    const AnimationHandle handle,
    const uint8_t requestedRoute,
    const uint8_t selectedRoute,
    std::optional<TrackBuildFailureReason> trackBuildFailureReason) {
  const auto now = std::chrono::steady_clock::now().time_since_epoch();
  sink.record(NativeAnimationTraceEvent{
      .monotonicTimeMs = std::chrono::duration<double, std::milli>(now).count(),
      .event = NativeAnimationTraceEventType::RouteDecision,
      .handle = handle,
      .objective = 7,
      .requestedRoute = requestedRoute,
      .selectedRoute = selectedRoute,
      .trackBuildFailureReason = trackBuildFailureReason,
  });
}

#endif

} // namespace reanimated::native_animation
