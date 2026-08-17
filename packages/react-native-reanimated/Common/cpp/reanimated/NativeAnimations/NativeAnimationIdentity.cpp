#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>

#include <react/utils/hash_combine.h>

namespace reanimated::native_animation {

size_t AnimationHandleHash::operator()(const AnimationHandle &handle) const noexcept {
  return facebook::react::hash_combine(
      handle.surfaceId, handle.tag, static_cast<uint8_t>(handle.owner), handle.generation);
}

bool targetsConflict(const AnimationTargetClaim &lhs, const AnimationTargetClaim &rhs) {
  if (std::holds_alternative<AllVisualTargets>(lhs) || std::holds_alternative<AllVisualTargets>(rhs)) {
    return true;
  }
  const auto lhsKind = std::get<AnimationTarget>(lhs).kind;
  const auto rhsKind = std::get<AnimationTarget>(rhs).kind;
  if (lhsKind == rhsKind) {
    return true;
  }
  const auto isPositionPart = [](const AnimationTargetKind kind) {
    return kind == AnimationTargetKind::PositionX || kind == AnimationTargetKind::PositionY;
  };
  const auto isSizePart = [](const AnimationTargetKind kind) {
    return kind == AnimationTargetKind::Width || kind == AnimationTargetKind::Height;
  };
  return (lhsKind == AnimationTargetKind::Position && isPositionPart(rhsKind)) ||
      (rhsKind == AnimationTargetKind::Position && isPositionPart(lhsKind)) ||
      (lhsKind == AnimationTargetKind::Size && isSizePart(rhsKind)) ||
      (rhsKind == AnimationTargetKind::Size && isSizePart(lhsKind));
}

} // namespace reanimated::native_animation
