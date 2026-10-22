#pragma once

#ifndef NDEBUG

#include <reanimated/NativeAnimations/NativeAnimationRequest.h>

#include <cstdint>
#include <deque>
#include <optional>
#include <string_view>
#include <vector>

namespace reanimated::native_animation {

enum class TraceEventType : uint8_t {
  Received,
  Admitted,
  TrackStarted,
  TrackEnded,
  Ended,
  SurfaceClosed,
  /// Layout let the final state of the view mount and holds a start for the mount report.
  LayoutStartPending,
  /// The transaction of the pending start is on the host views.
  LayoutStartMounted,
  /// The first frame-driven update of a view after its native command is on the host views.
  FrameUpdateMounted,
  /// The value on screen at the first display frame after a start in a mount report.
  FirstFrameSampled,
  /// The layout client got the admission report.
  ClientAdmitted,
  /// The layout client got the result.
  ClientEnded,
  /// Layout keeps the animation of a build frame-driven. The event gives the reason.
  LayoutBuildFailed,
};

struct TraceEvent {
  static constexpr uint8_t SchemaVersion = 1;

  uint8_t schemaVersion{SchemaVersion};
  uint64_t sequence{0};
  double monotonicTimeMs{0};
  TraceEventType event;
  AnimationHandle handle;
  std::optional<AnimationTarget> target;
  uint8_t objective{5};
  std::optional<EndpointPolicy> endpointPolicy;
  std::optional<bool> finished;
  std::optional<AnimationResult> result;
  std::optional<TrackBuildFailure> buildFailure;
  std::optional<int64_t> transactionNumber;
  /// The components of the value on screen.
  std::vector<double> presentationValue;
};

std::string_view toString(TraceEventType event);
std::string_view toString(AnimationOwner owner);
std::string_view toString(AnimationTarget target);
std::optional<AnimationTarget> targetFromString(std::string_view name);
std::string_view toString(EndpointPolicy policy);
std::string_view toString(AnimationOutcome outcome);
std::string_view toString(AnimationResultReason reason);
std::string_view toString(TrackBuildFailure failure);

/// Development record of lifecycle facts. Each layer records its own events at the point where the fact
/// occurs. It keeps the newest events. UI thread only.
class TraceRecorder {
 public:
  static double now();

  void record(TraceEvent event);
  std::vector<TraceEvent> take();

 private:
  static constexpr size_t Capacity = 1024;

  std::deque<TraceEvent> events_;
  uint64_t sequence_{0};
};

} // namespace reanimated::native_animation

#endif // NDEBUG
