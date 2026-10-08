#include <reanimated/NativeAnimations/NativeAnimationTrack.h>

#include <algorithm>

#include <cmath>

namespace reanimated::native_animation {

namespace {

bool isValidValue(const AnimationValue &value, const AnimationTarget target) {
  return isFinite(value) && valueMatchesTarget(value, target);
}

struct ValidStartVisitor {
  AnimationTarget target;

  bool operator()(const AnimationValue &value) const {
    return isValidValue(value, target);
  }
  bool operator()(const CurrentVisualValue &) const {
    return true;
  }
  bool operator()(const VisualValueIfInterrupting &start) const {
    return isValidValue(start.otherwise, target);
  }
};

bool isValidDuration(const double durationMs) {
  return std::isfinite(durationMs) && durationMs >= 0;
}

/// `UnsupportedTrackForm` for a timeline with no segment, and for one with more than one segment and no
/// duration.
template <typename Value, typename IsValidValue>
std::optional<TrackBuildFailure> validateSegments(
    const std::vector<TimelineSegment<Value>> &segments,
    const double durationMs,
    const IsValidValue &isValidValue) {
  if (segments.empty() || (durationMs == 0 && segments.size() != 1)) {
    return TrackBuildFailure::UnsupportedTrackForm;
  }
  double previousOffset = 0;
  for (const auto &segment : segments) {
    if (!(segment.endOffset > previousOffset && segment.endOffset <= 1) || !isValidValue(segment.endValue) ||
        !isValid(segment.timingFromPrevious)) {
      return TrackBuildFailure::InvalidValue;
    }
    previousOffset = segment.endOffset;
  }
  return previousOffset == 1 ? std::nullopt : std::optional(TrackBuildFailure::InvalidValue);
}

bool holdsOneValue(const OperationTimeline &operation) {
  return std::ranges::all_of(operation.segments, [&operation](const TimelineSegment<double> &segment) {
    return segment.endValue == operation.start;
  });
}

struct BodyValidator {
  const AnimationTrack &track;

  std::optional<TrackBuildFailure> operator()(const ValueTimeline &timeline) const {
    if (track.target == AnimationTarget::Transform) {
      return TrackBuildFailure::UnsupportedTrackForm;
    }
    if (!std::visit(ValidStartVisitor{track.target}, timeline.start)) {
      return TrackBuildFailure::InvalidValue;
    }
    return validateSegments(timeline.segments, track.durationMs, [this](const AnimationValue &value) {
      return isValidValue(value, track.target);
    });
  }

  std::optional<TrackBuildFailure> operator()(const TransformTimelines &body) const {
    if (track.target != AnimationTarget::Transform) {
      return TrackBuildFailure::UnsupportedTrackForm;
    }
    for (const auto &operation : body.operations) {
      if (!std::isfinite(operation.start)) {
        return TrackBuildFailure::InvalidValue;
      }
      const auto failure = validateSegments(
          operation.segments, track.durationMs, [](const double value) { return std::isfinite(value); });
      if (failure) {
        return failure;
      }
    }
    const bool changesPerspective = std::ranges::any_of(body.operations, [](const OperationTimeline &operation) {
      return operation.kind == TransformOperationKind::Perspective && !holdsOneValue(operation);
    });
    return changesPerspective ? std::optional(TrackBuildFailure::UnsupportedValue) : std::nullopt;
  }
};

struct ChangesValueVisitor {
  bool operator()(const ValueTimeline &timeline) const {
    const auto *start = std::get_if<AnimationValue>(&timeline.start);
    return start == nullptr || !std::ranges::all_of(timeline.segments, [start](const AnimationSegment &segment) {
             return isSameValue(*start, segment.endValue);
           });
  }

  bool operator()(const TransformTimelines &body) const {
    return std::ranges::any_of(body.operations, [](const OperationTimeline &operation) {
      return std::ranges::any_of(operation.segments, [&operation](const TimelineSegment<double> &segment) {
        return !isSameOperationValue(operation.kind, operation.start, segment.endValue);
      });
    });
  }
};

} // namespace

std::optional<TrackBuildFailure> validateTrack(const AnimationTrack &track) {
  if (!isValidDuration(track.delayMs) || !isValidDuration(track.durationMs)) {
    return TrackBuildFailure::InvalidValue;
  }
  return std::visit(BodyValidator{track}, track.body);
}

TrackPlayback playbackOf(const AnimationTrack &track) {
  if (track.durationMs > 0 || track.endpointPolicy != EndpointPolicy::MountedModelMustMatchEndpoint) {
    return TrackPlayback::Interpolated;
  }
  return track.delayMs > 0 ? TrackPlayback::HeldThroughDelay : TrackPlayback::Immediate;
}

bool changesValue(const AnimationTrack &track) {
  return std::visit(ChangesValueVisitor{}, track.body);
}

TransformEndpoints endpointsOf(const TransformTimelines &body) {
  TransformEndpoints endpoints;
  endpoints.start.operations.reserve(body.operations.size());
  endpoints.end.operations.reserve(body.operations.size());
  for (const auto &operation : body.operations) {
    endpoints.start.operations.push_back({operation.kind, operation.start});
    endpoints.end.operations.push_back({operation.kind, operation.segments.back().endValue});
  }
  return endpoints;
}

} // namespace reanimated::native_animation
