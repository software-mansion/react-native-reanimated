#include <reanimated/NativeAnimations/NativeAnimationValidation.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated::native_animation {

namespace {

// TODO: Replace these provisional structural caps with a measured aggregate
// budget for tracks, total segments, timing points, and encoded value cost.
constexpr size_t kMaximumTracksPerPlan = 128;
constexpr size_t kMaximumSegmentsPerTrack = 4096;

bool isValidSegment(const AnimationSegment &segment, const AnimationTarget target, const double previousOffset) {
  return std::isfinite(segment.endOffset) && segment.endOffset > previousOffset && segment.endOffset <= 1 &&
      isFinite(segment.endValue) && valueMatchesTarget(segment.endValue, target) &&
      isFinite(segment.timingFromPrevious) && hasOrderedTimingPoints(segment.timingFromPrevious);
}

std::optional<TrackBuildFailure> validateAnimationTrack(const AnimationTrack &track) {
  if (!std::isfinite(track.delayMs) || !std::isfinite(track.durationMs) || track.delayMs < 0 || track.durationMs < 0) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }
  if (track.segments.empty()) {
    return TrackBuildFailure{TrackBuildFailureReason::UnsupportedTrackForm};
  }
  if (track.segments.size() > kMaximumSegmentsPerTrack) {
    return TrackBuildFailure{TrackBuildFailureReason::ResourceLimit};
  }
  if (const auto *start = std::get_if<AnimationValue>(&track.start);
      start != nullptr && (!isFinite(*start) || !valueMatchesTarget(*start, track.target))) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }

  double previousOffset = 0;
  for (const auto &segment : track.segments) {
    if (!isValidSegment(segment, track.target, previousOffset)) {
      return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
    }
    previousOffset = segment.endOffset;
  }
  if (previousOffset != 1) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }
  return std::nullopt;
}

} // namespace

TrackBuildResult buildAnimationTrack(AnimationTrack track) {
  if (const auto failure = validateAnimationTrack(track)) {
    return *failure;
  }
  return track;
}

std::optional<AnimationResultReason> validateAnimationPlan(const AnimationPlan &plan) {
  if (plan.tracks.empty()) {
    return AnimationResultReason::InvalidPlan;
  }
  if (plan.tracks.size() > kMaximumTracksPerPlan) {
    return AnimationResultReason::ResourceLimit;
  }
  std::vector<AnimationTargetClaim> targets;
  targets.reserve(plan.tracks.size());
  for (const auto &track : plan.tracks) {
    if (const auto failure = validateAnimationTrack(track)) {
      return failure->reason == TrackBuildFailureReason::ResourceLimit ? AnimationResultReason::ResourceLimit
                                                                       : AnimationResultReason::InvalidPlan;
    }
    const AnimationTargetClaim target = track.target;
    const auto conflictsWithTarget = [&](const AnimationTargetClaim &existing) {
      return targetsConflict(existing, target);
    };
    if (std::ranges::any_of(targets, conflictsWithTarget)) {
      return AnimationResultReason::InvalidPlan;
    }
    targets.push_back(target);
  }
  return std::nullopt;
}

} // namespace reanimated::native_animation
