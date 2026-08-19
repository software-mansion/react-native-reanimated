#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <optional>
#include <vector>

namespace reanimated::native_animation {

#ifndef NDEBUG

enum class NativeAnimationTraceEventType : uint8_t {
  Schedule,
  Validation,
  Claim,
  Rejection,
  Terminal,
  // Objective 06 layout mount-order events.
  MountEnqueue,
  MountDrain,
  // Objective 07 layout route decision.
  RouteDecision,
};

struct NativeAnimationTraceEvent {
  static constexpr uint8_t SchemaVersion = 1;

  uint8_t schemaVersion{SchemaVersion};
  // The sink assigns this field. It gives a total order in one recorder
  // session; the shared record helper leaves it at zero.
  uint64_t sequence{0};
  double monotonicTimeMs{0};
  NativeAnimationTraceEventType event;
  AnimationHandle handle;
  std::optional<AnimationTargetClaim> target;
  // The roadmap objective that introduced this event set. Objective 05 owns
  // every current event; a later objective sets its own number for new events.
  uint8_t objective{5};
  std::optional<AnimationOutcome> outcome;
  std::optional<AnimationResultReason> reason;
  // RouteDecision payload. The domain that records the event owns the route
  // value meaning; the envelope stays domain-neutral.
  std::optional<uint8_t> requestedRoute;
  std::optional<uint8_t> selectedRoute;
  std::optional<TrackBuildFailureReason> trackBuildFailureReason;
};

class NativeAnimationTraceSink {
 public:
  virtual ~NativeAnimationTraceSink() = default;
  // The sink must assign `sequence` when it stores the event.
  virtual void record(NativeAnimationTraceEvent event) = 0;
};

class NullNativeAnimationTraceSink final : public NativeAnimationTraceSink {
 public:
  void record(NativeAnimationTraceEvent) override {}
};

void recordNativeAnimationTrace(
    NativeAnimationTraceSink &sink,
    NativeAnimationTraceEventType event,
    AnimationHandle handle,
    std::optional<AnimationTargetClaim> target = std::nullopt,
    std::optional<AnimationOutcome> outcome = std::nullopt,
    std::optional<AnimationResultReason> reason = std::nullopt,
    uint8_t objective = 5);

void recordNativeAnimationRouteTrace(
    NativeAnimationTraceSink &sink,
    AnimationHandle handle,
    uint8_t requestedRoute,
    uint8_t selectedRoute,
    std::optional<TrackBuildFailureReason> trackBuildFailureReason);

#else

#define recordNativeAnimationTrace(...) ((void)0)
#define recordNativeAnimationRouteTrace(...) ((void)0)

#endif

} // namespace reanimated::native_animation
