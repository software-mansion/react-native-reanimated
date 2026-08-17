#include <reanimated/NativeAnimations/NativeAnimationValidation.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated::native_animation {

namespace {

// TODO: Replace these provisional structural caps with a measured aggregate
// budget for tracks, total keyframes, timing points, and encoded value cost.
constexpr size_t kMaximumTracksPerPlan = 128;
constexpr size_t kMaximumKeyframesPerTrack = 4096;

std::optional<TrackBuildFailure> validateAnimationTrack(const AnimationTrack &track) {
  if (!std::isfinite(track.delayMs) || !std::isfinite(track.durationMs) || track.delayMs < 0 || track.durationMs < 0) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }
  if (track.keyframes.empty()) {
    return TrackBuildFailure{TrackBuildFailureReason::UnsupportedTrackForm};
  }
  if (track.keyframes.size() > kMaximumKeyframesPerTrack) {
    return TrackBuildFailure{TrackBuildFailureReason::ResourceLimit};
  }
  if (const auto *start = std::get_if<AnimationValue>(&track.start);
      start != nullptr && (!isFinite(*start) || !valueMatchesTarget(*start, track.target))) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }

  double previousOffset = -1;
  for (const auto &keyframe : track.keyframes) {
    if (!std::isfinite(keyframe.offset) || keyframe.offset < 0 || keyframe.offset > 1 ||
        keyframe.offset < previousOffset || !isFinite(keyframe.value) ||
        !valueMatchesTarget(keyframe.value, track.target) || !isFinite(keyframe.timingToNext) ||
        !hasOrderedTimingPoints(keyframe.timingToNext)) {
      return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
    }
    previousOffset = keyframe.offset;
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
