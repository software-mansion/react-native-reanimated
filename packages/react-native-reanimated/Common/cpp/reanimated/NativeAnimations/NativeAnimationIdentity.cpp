#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>

#include <react/utils/hash_combine.h>

namespace reanimated::native_animation {

namespace {

bool contains(const AnimationTarget whole, const AnimationTarget part) {
  switch (whole) {
    case AnimationTarget::Position:
      return part == AnimationTarget::PositionX || part == AnimationTarget::PositionY;
    case AnimationTarget::Size:
      return part == AnimationTarget::Width || part == AnimationTarget::Height;
    default:
      return false;
  }
}

} // namespace

size_t AnimationHandleHash::operator()(const AnimationHandle &handle) const noexcept {
  return facebook::react::hash_combine(
      handle.surfaceId, handle.tag, static_cast<uint8_t>(handle.owner), handle.generation);
}

bool targetsOverlap(const AnimationTarget lhs, const AnimationTarget rhs) {
  return lhs == rhs || contains(lhs, rhs) || contains(rhs, lhs);
}

size_t TrackKeyHash::operator()(const TrackKey &key) const noexcept {
  return facebook::react::hash_combine(AnimationHandleHash{}(key.handle), static_cast<uint8_t>(key.target));
}

} // namespace reanimated::native_animation
