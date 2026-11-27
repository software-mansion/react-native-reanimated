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
};

std::string_view toString(TraceEventType event);
std::string_view toString(AnimationOwner owner);
std::string_view toString(AnimationTarget target);
std::string_view toString(EndpointPolicy policy);
std::string_view toString(AnimationOutcome outcome);
std::string_view toString(AnimationResultReason reason);

/// Development record of host lifecycle facts. It keeps the newest events. UI thread only.
class TraceRecorder {
 public:
  void record(TraceEvent event);
  std::vector<TraceEvent> take();

 private:
  static constexpr size_t Capacity = 1024;

  std::deque<TraceEvent> events_;
  uint64_t sequence_{0};
};

} // namespace reanimated::native_animation

#endif // NDEBUG
