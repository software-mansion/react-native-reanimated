#include <reanimated/NativeAnimations/NativeAnimationValidation.h>

#include <algorithm>
#include <cmath>
#include <utility>

namespace reanimated::native_animation {

namespace {

std::optional<TrackBuildFailure> validateAnimationTrack(const AnimationTrack &track) {
  if (!std::isfinite(track.delayMs) || !std::isfinite(track.durationMs) || track.delayMs < 0 || track.durationMs < 0) {
    return TrackBuildFailure{TrackBuildFailureReason::InvalidValue};
  }
  if (track.keyframes.empty()) {
    return TrackBuildFailure{TrackBuildFailureReason::UnsupportedTrackForm};
  }
  NativeAnimationResourceUsage usage;
  if (!accumulateTrackUsage(track, kDefaultResourceBudget, usage)) {
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

size_t encodedScalarCount(const AnimationValue &value) {
  if (std::holds_alternative<double>(value)) {
    return 1;
  }
  if (std::holds_alternative<AnimationPoint>(value) || std::holds_alternative<AnimationSize>(value)) {
    return 2;
  }
  if (std::holds_alternative<AnimationColor>(value)) {
    return 4;
  }
  return std::get<AnimationMatrix4>(value).values.size();
}

size_t timingPointCount(const AnimationTiming &timing) {
  if (const auto *steps = std::get_if<StepsTiming>(&timing)) {
    return steps->points.size();
  }
  if (const auto *stops = std::get_if<LinearStopsTiming>(&timing)) {
    return stops->points.size();
  }
  return 0;
}

bool accumulateTrackUsage(
    const AnimationTrack &track,
    const NativeAnimationResourceBudget &budget,
    NativeAnimationResourceUsage &usage) {
  usage.tracks += 1;
  usage.keyframes += track.keyframes.size();
  if (const auto *start = std::get_if<AnimationValue>(&track.start)) {
    usage.encodedScalars += encodedScalarCount(*start);
  }
  for (const auto &keyframe : track.keyframes) {
    usage.timingPoints += timingPointCount(keyframe.timingToNext);
    usage.encodedScalars += encodedScalarCount(keyframe.value);
  }
  return usage.tracks <= budget.maxTracksPerPlan && usage.keyframes <= budget.maxKeyframesPerPlan &&
      usage.timingPoints <= budget.maxTimingPointsPerPlan && usage.encodedScalars <= budget.maxEncodedScalarsPerPlan;
}

bool supportsTiming(const NativeTrackFormSupport &support, const AnimationTiming &timing) {
  if (std::holds_alternative<LinearTiming>(timing)) {
    return support.linearTiming;
  }
  if (std::holds_alternative<CubicBezier>(timing)) {
    return support.cubicBezierTiming;
  }
  if (std::holds_alternative<StepsTiming>(timing)) {
    return support.stepsTiming;
  }
  return support.linearStopsTiming;
}

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
  NativeAnimationResourceUsage usage;
  std::vector<AnimationTargetClaim> targets;
  targets.reserve(plan.tracks.size());
  for (const auto &track : plan.tracks) {
    if (const auto failure = validateAnimationTrack(track)) {
      return failure->reason == TrackBuildFailureReason::ResourceLimit ? AnimationResultReason::ResourceLimit
                                                                       : AnimationResultReason::InvalidPlan;
    }
    if (!accumulateTrackUsage(track, kDefaultResourceBudget, usage)) {
      return AnimationResultReason::ResourceLimit;
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
