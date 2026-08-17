#include <reanimated/NativeAnimations/NativeAnimationConflictPolicy.h>

namespace reanimated::native_animation {

ConflictAction DefaultNativeAnimationConflictPolicy::decide(
    const AnimationHandle &incoming,
    const AnimationHandle &existing) const {
  if (incoming.owner == existing.owner) {
    return incoming.generation > existing.generation ? ConflictAction::Replace : ConflictAction::Reject;
  }
  if (incoming.owner == AnimationOwner::Layout) {
    return ConflictAction::Replace;
  }
  if (existing.owner == AnimationOwner::Layout) {
    return ConflictAction::Reject;
  }
  // FUTURE: The RFC does not set priority between CSS transitions and CSS animations.
  // Keep the current owner until the CSS domain supplies that policy.
  return ConflictAction::Reject;
}

} // namespace reanimated::native_animation
