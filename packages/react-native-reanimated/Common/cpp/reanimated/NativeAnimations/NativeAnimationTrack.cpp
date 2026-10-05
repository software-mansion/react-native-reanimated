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

std::optional<TrackBuildFailure> validateTransformTrack(const AnimationTrack &track) {
  const auto *startValue = std::get_if<AnimationValue>(&track.start);
  const auto *start = startValue == nullptr ? nullptr : std::get_if<AnimationTransform>(startValue);
  if (start == nullptr) {
    return TrackBuildFailure::UnsupportedTrackForm;
  }
  for (const auto &segment : track.segments) {
    const auto &end = std::get<AnimationTransform>(segment.endValue);
    if (!hasSameOperationKinds(*start, end)) {
      return TrackBuildFailure::UnsupportedTrackForm;
    }
    for (size_t index = 0; index < end.operations.size(); ++index) {
      const auto &operation = end.operations[index];
      if (operation.kind == TransformOperationKind::Perspective && operation.value != start->operations[index].value) {
        return TrackBuildFailure::UnsupportedValue;
      }
    }
  }
  return std::nullopt;
}

} // namespace

std::optional<TrackBuildFailure> validateTrack(const AnimationTrack &track) {
  if (!isValidDuration(track.delayMs) || !isValidDuration(track.durationMs) ||
      !std::visit(ValidStartVisitor{track.target}, track.start)) {
    return TrackBuildFailure::InvalidValue;
  }
  if (track.segments.empty() || (track.durationMs == 0 && track.segments.size() != 1)) {
    return TrackBuildFailure::UnsupportedTrackForm;
  }

  double previousOffset = 0;
  for (const auto &segment : track.segments) {
    if (!(segment.endOffset > previousOffset && segment.endOffset <= 1) ||
        !isValidValue(segment.endValue, track.target) || !isValid(segment.timingFromPrevious)) {
      return TrackBuildFailure::InvalidValue;
    }
    previousOffset = segment.endOffset;
  }
  if (previousOffset != 1) {
    return TrackBuildFailure::InvalidValue;
  }
  return track.target == AnimationTarget::Transform ? validateTransformTrack(track) : std::nullopt;
}

TrackPlayback playbackOf(const AnimationTrack &track) {
  if (track.durationMs > 0 || track.endpointPolicy != EndpointPolicy::MountedModelMustMatchEndpoint) {
    return TrackPlayback::Interpolated;
  }
  return track.delayMs > 0 ? TrackPlayback::HeldThroughDelay : TrackPlayback::Immediate;
}

bool changesValue(const AnimationTrack &track) {
  const auto *start = std::get_if<AnimationValue>(&track.start);
  return start == nullptr || !std::ranges::all_of(track.segments, [start](const AnimationSegment &segment) {
           return isSameValue(*start, segment.endValue);
         });
}

} // namespace reanimated::native_animation
