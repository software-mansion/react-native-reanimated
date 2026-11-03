#include <reanimated/NativeAnimations/NativeAnimationTrack.h>

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
  return previousOffset == 1 ? std::nullopt : std::optional(TrackBuildFailure::InvalidValue);
}

TrackPlayback playbackOf(const AnimationTrack &track) {
  if (track.durationMs > 0 || track.endpointPolicy != EndpointPolicy::MountedModelMustMatchEndpoint) {
    return TrackPlayback::Interpolated;
  }
  return track.delayMs > 0 ? TrackPlayback::HeldThroughDelay : TrackPlayback::Immediate;
}

} // namespace reanimated::native_animation
