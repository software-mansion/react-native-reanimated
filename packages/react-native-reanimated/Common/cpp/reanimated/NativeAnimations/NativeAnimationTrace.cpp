#include <reanimated/NativeAnimations/NativeAnimationTrace.h>

#include <chrono>
#include <cstdio>
#include <memory>
#include <string>
#include <variant>

namespace reanimated::native_animation {

#ifndef NDEBUG

#ifdef IS_REANIMATED_EXAMPLE_APP

void StderrNativeAnimationTraceSink::record(NativeAnimationTraceEvent event) {
  event.sequence = ++sequence_;
  std::string suffix;
  if (event.target) {
    suffix += " target=" +
        (std::holds_alternative<AllVisualTargets>(*event.target)
             ? std::string("all")
             : std::to_string(static_cast<unsigned>(std::get<AnimationTarget>(*event.target).kind)));
  }
  if (event.outcome) {
    suffix += " outcome=" + std::to_string(static_cast<unsigned>(*event.outcome)) +
        " reason=" + std::to_string(static_cast<unsigned>(event.reason.value_or(AnimationResultReason::None)));
  }
  std::fprintf(
      stderr,
      "[Reanimated.native-animation] seq=%llu event=%u objective=%u surface=%d tag=%d owner=%u generation=%llu%s\n",
      static_cast<unsigned long long>(event.sequence),
      static_cast<unsigned>(event.event),
      static_cast<unsigned>(event.objective),
      event.handle.surfaceId,
      event.handle.tag,
      static_cast<unsigned>(event.handle.owner),
      static_cast<unsigned long long>(event.handle.generation),
      suffix.c_str());
}

#endif

std::shared_ptr<NativeAnimationTraceSink> makeDefaultNativeAnimationTraceSink() {
#ifdef IS_REANIMATED_EXAMPLE_APP
  return std::make_shared<StderrNativeAnimationTraceSink>();
#else
  return std::make_shared<NullNativeAnimationTraceSink>();
#endif
}

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

#endif

} // namespace reanimated::native_animation
